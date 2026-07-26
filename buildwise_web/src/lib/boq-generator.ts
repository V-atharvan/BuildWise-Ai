import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface BOQItem {
  srNo: number
  category: string
  description: string
  isCode: string
  formula: string
  quantity: number
  unit: string
  rate: number
  amount: number
  wastePct: number
  gstPct: number
}

export function generateBOQItems(estimation: any): BOQItem[] {
  const m = estimation.materials || {}
  const c = estimation.cost_breakdown || estimation.cost || {}
  const p = estimation.user_inputs || {}

  const items: BOQItem[] = []
  let index = 1

  const add = (
    category: string,
    desc: string,
    isCode: string,
    formula: string,
    qty: number,
    unit: string,
    rate: number,
    amount: number,
    wastePct = 5,
    gstPct = 18
  ) => {
    if (qty > 0 || amount > 0) {
      items.push({
        srNo: index++,
        category,
        description: desc,
        isCode,
        formula,
        quantity: Math.round(qty * 100) / 100,
        unit,
        rate: Math.round(rate * 100) / 100,
        amount: Math.round(amount),
        wastePct,
        gstPct
      })
    }
  }

  // 1. Earthwork
  add('Civil & Earthwork', 'Earthwork Excavation for foundations and trenches', 'IS 1200 (Part 1)', 'V = Envelope Area × Plinth Height', m.excavation_volume || 0, 'm³', (c.excavation_cost || 1) / (m.excavation_volume || 1), c.excavation_cost || 0, 0, 18)

  // 2. Concrete Structural Framing
  add('Structural RCC', 'Concrete RCC Mix (Slabs, Beams, Columns, Footings, Stairs)', 'IS 1200 (Part 2) / IS 456', 'V_RCC = V_slabs + V_columns + V_beams + V_footings', m.concrete_volume || 0, 'm³', (c.concrete_cost || 1) / (m.concrete_volume || 1), c.concrete_cost || 0, p.waste_concrete ?? 2, 18)
  add('Structural RCC', 'TMT Steel Reinforcement Bars (Fe500/Fe550 Rebar)', 'IS 1786 / IS 2502', 'W_steel = ∑(V_member × Rebar Density kg/m³) × (1 + Waste %)', m.steel_weight || 0, 'kg', (c.steel_cost || 1) / (m.steel_weight || 1), c.steel_cost || 0, p.waste_steel ?? 3, 18)
  add('Structural RCC', 'OPC / PPC 53 Grade Cement Bags (50kg units)', 'IS 456 / IS 10262', 'Bags = ⌈(Dry Mortar Vol ÷ 0.0347) + (Dry RCC Vol × Cement Ratio ÷ 0.0347)⌉', m.cement_bags || 0, 'bags', (c.cement_cost || 1) / (m.cement_bags || 1), c.cement_cost || 0, 5, 18)
  add('Structural RCC', 'Coarse River Sand / M-Sand Aggregate', 'IS 383', 'Vol = Mortar Vol × Sand Ratio × 1.20 Bulking Factor', m.sand_volume || 0, 'm³', (c.sand_cost || 1) / (m.sand_volume || 1), c.sand_cost || 0, 5, 18)
  add('Structural RCC', 'Graded Stone Aggregate (10mm / 20mm)', 'IS 383', 'Vol = RCC Concrete Vol × Agg Mix Fraction', m.aggregate_volume || 0, 'm³', (c.aggregate_cost || 1) / (m.aggregate_volume || 1), c.aggregate_cost || 0, 5, 18)

  // 3. Masonry
  const brickQty = m.bricks_count || m.blocks_count || 0
  const brickUnit = m.bricks_count ? 'nos' : 'nos (AAC)'
  const isAAC = p.brick_type === 'aac_block'
  add('Masonry & Partition', isAAC ? 'AAC Light Wall Blocks (600×200×200mm)' : 'Burnt Red Clay Brickwork (230×110×75mm)', 'IS 1200 (Part 3) / IS 2212', 'Count = Net Wall Vol (m³) ÷ Unit Volume with Mortar Joint', brickQty, brickUnit, (isAAC ? c.block_cost : c.brick_cost) / (brickQty || 1), isAAC ? c.block_cost : c.brick_cost, p.waste_brick ?? 5, 18)

  // 4. Finishes
  add('Finishes & Plaster', 'Internal (12mm) & External (20mm) Cement Plaster', 'IS 1200 (Part 12) / IS 1661', 'Area = Wall Surface Faces - Opening Deductions', m.plaster_area || 0, 'm²', (c.plaster_cost || 1) / (m.plaster_area || 1), c.plaster_cost || 0, p.waste_plaster ?? 5, 18)
  add('Finishes & Plaster', 'Double Coat Decorative Paint (Primer + Emulsion)', 'IS 1200 (Part 13)', 'Area = Plastered Wall Surface Area', m.paint_area || 0, 'm²', (c.paint_cost || 1) / (m.paint_area || 1), c.paint_cost || 0, p.waste_paint ?? 10, 18)
  add('Finishes & Plaster', 'Vitrified Flooring Tiles (600×600mm / 2×2 ft)', 'IS 1200 (Part 11) / IS 15622', 'Boxes = ⌈(Carpet Area ÷ Box Coverage) × (1 + Waste %)⌉', m.tiles_area || 0, 'm²', (c.tiles_cost || 1) / (m.tiles_area || 1), c.tiles_cost || 0, p.waste_tiles ?? 8, 18)

  // 5. Openings
  const doorsCount = m.doors_count || 0
  const windowsCount = m.windows_count || 0
  add('Openings', 'Wooden Flush Doors with Frame & Fittings', 'IS 1200 (Part 8)', 'Count = Detected Door Openings', doorsCount, 'nos', 4500, doorsCount * 4500, 0, 18)
  add('Openings', 'Aluminium / UPVC Glazed Sliding Windows', 'IS 1200 (Part 8)', 'Count = Detected Window Openings', windowsCount, 'nos', 3500, windowsCount * 3500, 0, 18)

  return items
}

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-TAB EXCEL WORKBOOK EXPORT (IS 1200 AUDIT READY)
// ══════════════════════════════════════════════════════════════════════════════

export function buildBOQWorksheet(
  projectName: string,
  sections: { name: string; items: { sl: string | number; desc: string; unit: string; qty: number; rate: number }[] }[],
  summaryCosts: {
    labour?: number
    equipment?: number
    margin?: number
    contingency?: number
  } = {}
) {
  const ws: any = {}
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Row 1 Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }  // Row 2 Subtitle
  ]

  // Row 1 Title
  ws['A1'] = { t: 's', v: 'BuildWise AI — Construction BOQ Report' }

  // Row 2 Subtitle
  ws['A2'] = { t: 's', v: `Project: ${projectName} | Date: ${new Date().toLocaleDateString()}` }

  // Row 4 Table Headers
  const headers = ['Sl No', 'Item Description', 'Unit', 'Quantity', 'Rate (₹)', 'Amount (₹)']
  headers.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIdx })
    ws[cellRef] = { t: 's', v: h }
  })

  let currentRow = 4
  const amountCellRefs: string[] = []

  sections.forEach(sec => {
    // Section Header Row
    ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } })
    ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: sec.name.toUpperCase() }
    currentRow++

    sec.items.forEach(item => {
      const rIdx = currentRow + 1
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: typeof item.sl === 'number' ? 'n' : 's', v: item.sl }
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { t: 's', v: item.desc }
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { t: 's', v: item.unit }
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 3 })] = { t: 'n', v: item.qty, z: '#,##0.00' }
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = { t: 'n', v: item.rate, z: '"₹"#,##0.00' }
      
      const amtCell = XLSX.utils.encode_cell({ r: currentRow, c: 5 })
      ws[amtCell] = { t: 'n', f: `D${rIdx}*E${rIdx}`, z: '"₹"#,##0.00' }
      amountCellRefs.push(amtCell)
      currentRow++
    })
  })

  // Empty Spacer Row
  currentRow++

  // BOQ SUMMARY BREAKDOWN
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'BOQ SUMMARY BREAKDOWN' }
  currentRow++

  const firstAmtRef = amountCellRefs[0] || 'F5'
  const lastAmtRef = amountCellRefs[amountCellRefs.length - 1] || 'F5'

  // Material Takeoff Cost
  const matRow = currentRow + 1
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Material Takeoff Cost' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', f: `SUM(${firstAmtRef}:${lastAmtRef})`, z: '"₹"#,##0.00' }
  currentRow++

  // Labour Takeoff Cost
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Labour Takeoff Cost' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: summaryCosts.labour ?? 330000, z: '"₹"#,##0.00' }
  currentRow++

  // Machinery & Rental Equipment
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Machinery & Rental Equipment' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: summaryCosts.equipment ?? 55000, z: '"₹"#,##0.00' }
  currentRow++

  // Overhead & Contractor Margin
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Overhead & Contractor Margin' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: summaryCosts.margin ?? 155000, z: '"₹"#,##0.00' }
  currentRow++

  // Contingency Buffer
  const contRow = currentRow + 1
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Contingency Buffer' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: summaryCosts.contingency ?? 77000, z: '"₹"#,##0.00' }
  currentRow++

  const subtotalStart = matRow
  const subtotalEnd = contRow

  // GST (18% applied)
  const gstRow = currentRow + 1
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'GST (18% applied)' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', f: `SUM(F${subtotalStart}:F${subtotalEnd})*0.18`, z: '"₹"#,##0.00' }
  currentRow++

  // GRAND TOTAL CONTRACT AMOUNT
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'GRAND TOTAL CONTRACT AMOUNT' }
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', f: `SUM(F${subtotalStart}:F${gstRow})`, z: '"₹"#,##0.00' }
  currentRow++

  ws['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 48 }, // Description
    { wch: 10 }, // Unit
    { wch: 14 }, // Quantity
    { wch: 16 }, // Rate
    { wch: 22 }  // Amount
  ]

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: 5 } })
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4, activePane: 'bottomLeft' }]
  ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9 }

  return ws
}

export function exportToExcel(estimation: any, projectName: string) {
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}
  const audits = estimation.calculation_audits || []
  const rooms = estimation.room_takeoffs || []

  const workbook = XLSX.utils.book_new()

  // Sheet 1: Styled Construction BOQ Report
  const categoriesMap = new Map<string, any[]>()
  items.forEach(item => {
    const cat = item.category || 'General Works'
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, [])
    categoriesMap.get(cat)!.push({
      sl: item.srNo,
      desc: item.description,
      unit: item.unit,
      qty: item.quantity,
      rate: item.rate
    })
  })

  const formattedSections = Array.from(categoriesMap.entries()).map(([name, catItems]) => ({
    name,
    items: catItems
  }))

  const boqSheet = buildBOQWorksheet(projectName, formattedSections, {
    labour: c.labour_cost,
    equipment: c.equipment_cost,
    margin: c.contractor_margin,
    contingency: c.contingency
  })

  XLSX.utils.book_append_sheet(workbook, boqSheet, 'BOQ Report')

  // Sheet 2: Executive Summary
  const summaryData = [
    ['BUILDWISE AI — EXECUTIVE BOQ ESTIMATION REPORT'],
    ['Project Name', projectName],
    ['Project ID', estimation.project_id || estimation.id],
    ['Generated Date', new Date().toLocaleDateString()],
    ['IS Code Standard', 'IS 1200 / IS 456 / IS 1786'],
    ['Software Version', 'BuildWise AI Enterprise 2.5'],
    [],
    ['COST SUMMARY BREAKDOWN'],
    ['Direct Material Cost', c.total_material_cost || 0],
    ['Direct Craft Labour Wages', c.labour_cost || 0],
    ['Equipment & Machinery Rentals', c.equipment_cost || 0],
    ['Contractor Overheads & Margin', c.contractor_margin || 0],
    ['Contingency Buffer', c.contingency || 0],
    ['GST Tax Amount (18%)', c.gst_amount || 0],
    ['GRAND TOTAL PROJECT COST', c.grand_total || estimation.total_cost || 0]
  ]
  const sheetSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, sheetSummary, 'Executive Summary')

  // Sheet 3: Room Takeoffs
  const roomRows = rooms.map((r: any) => ({
    'Room Name': r.label,
    'Carpet Area (m²)': r.area_m2,
    'Perimeter (m)': r.perimeter_m,
    'Wall Surface Area (m²)': r.wall_area_m2,
    'Floor Tiles Boxes': r.flooring_tile_boxes,
    'Paint Volume (Ltrs)': r.paint_liters,
    'Total Room Cost (INR)': r.total_cost
  }))
  const sheetRooms = XLSX.utils.json_to_sheet(roomRows)
  XLSX.utils.book_append_sheet(workbook, sheetRooms, 'Room Takeoffs')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  saveAs(blob, `BOQ_Report_${projectName.replace(/\s+/g, '_')}.xlsx`)
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT TO CSV
// ══════════════════════════════════════════════════════════════════════════════

export function exportToCSV(estimation: any, projectName: string) {
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}

  const csvRows = [
    ['Sr No', 'Category', 'Description', 'IS Code', 'Formula', 'Quantity', 'Unit', 'Rate', 'Amount'],
    ...items.map(i => [i.srNo, i.category, i.description, i.isCode, i.formula, i.quantity, i.unit, i.rate, i.amount]),
    [],
    ['Total Material Cost', '', '', '', '', '', '', '', c.total_material_cost || 0],
    ['Labour Cost', '', '', '', '', '', '', '', c.labour_cost || 0],
    ['Equipment Cost', '', '', '', '', '', '', '', c.equipment_cost || 0],
    ['Contractor Margin', '', '', '', '', '', '', '', c.contractor_margin || 0],
    ['GST 18%', '', '', '', '', '', '', '', c.gst_amount || 0],
    ['Grand Total', '', '', '', '', '', '', '', c.grand_total || estimation.total_cost || 0]
  ]

  const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `BOQ_Report_${projectName.replace(/\s+/g, '_')}.csv`)
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT TO PROFESSIONAL PDF (WITH DIGITAL SIGNATURE BLOCK)
// ══════════════════════════════════════════════════════════════════════════════

export function exportToPDF(estimation: any, projectName: string) {
  const doc = new jsPDF()
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}
  const audits = estimation.calculation_audits || []

  // Header styling
  doc.setFontSize(20)
  doc.setTextColor(124, 58, 237) // violet-600
  doc.text('BuildWise AI', 14, 20)

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Enterprise Construction BOQ & Takeoff Audit Report (IS 1200 / IS 456)', 14, 26)
  doc.text(`Project: ${projectName} | ID: ${estimation.project_id || estimation.id}`, 14, 31)
  doc.text(`Date: ${new Date().toLocaleDateString()} | Calculation Engine: v2.5 IS-Compliant`, 14, 36)

  doc.line(14, 39, 196, 39)

  // Table 1: BOQ Items
  const columns = ['Sr', 'Category', 'Description', 'IS Code', 'Qty', 'Unit', 'Rate', 'Amount (INR)']
  const rows = items.map(i => [
    i.srNo,
    i.category,
    i.description,
    i.isCode,
    i.quantity,
    i.unit,
    i.rate.toLocaleString('en-IN'),
    i.amount.toLocaleString('en-IN')
  ])

  autoTable(doc, {
    startY: 43,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237], halign: 'left', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 25 },
      2: { cellWidth: 50 },
      3: { cellWidth: 32 },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 12 },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' }
    },
    styles: { fontSize: 7.5 }
  })

  let currentY = (doc as any).lastAutoTable.finalY + 10

  // Cost Summary Block
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.text('COST BREAKDOWN SUMMARY', 14, currentY)
  currentY += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  const addSummaryRow = (label: string, val: number) => {
    doc.text(label, 14, currentY)
    doc.text(`Rs. ${val.toLocaleString('en-IN')}`, 196, currentY, { align: 'right' })
    currentY += 5
  }

  addSummaryRow('Direct Material Cost:', c.total_material_cost || 0)
  addSummaryRow('Direct Craft Labour Wages:', c.labour_cost || 0)
  addSummaryRow('Equipment & Machinery Rentals:', c.equipment_cost || 0)
  addSummaryRow('Contractor Margin & Overheads:', c.contractor_margin || 0)
  addSummaryRow('Contingency Buffer:', c.contingency || 0)
  addSummaryRow('GST Tax Amount (18%):', c.gst_amount || 0)

  doc.line(14, currentY, 196, currentY)
  currentY += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(124, 58, 237)
  doc.text('GRAND TOTAL ESTIMATE:', 14, currentY)
  doc.text(`Rs. ${(c.grand_total || estimation.total_cost || 0).toLocaleString('en-IN')}`, 196, currentY, { align: 'right' })

  // Digital Signatures Block
  currentY += 16
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DIGITAL SIGN-OFF & VERIFICATION STAMP', 14, currentY)
  currentY += 12

  doc.line(14, currentY, 60, currentY)
  doc.line(80, currentY, 126, currentY)
  doc.line(146, currentY, 196, currentY)

  currentY += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Prepared By: Quantity Surveyor', 14, currentY)
  doc.text('Checked By: Structural Engineer', 80, currentY)
  doc.text('Approved By: Client / Contractor', 146, currentY)

  doc.save(`BOQ_Report_${projectName.replace(/\s+/g, '_')}.pdf`)
}
