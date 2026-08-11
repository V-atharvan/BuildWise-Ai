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

// ── Safe number helper: Guarantees zero NaN / Infinity / undefined cell errors ──
export function safeNum(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (isNaN(n) || !isFinite(n)) return fallback
  return n
}

// ── Indian Rupee Currency Formatter ─────────────────────────────────────────
export function formatRupee(v: number): string {
  const safe = safeNum(v)
  const intPart = Math.abs(Math.round(safe))
  const negative = safe < 0 ? '-' : ''
  const s = intPart.toString()

  if (s.length <= 3) return `${negative}₹${s}`
  const last3 = s.substring(s.length - 3)
  const rest = s.substring(0, s.length - 3)
  const buf: string[] = []
  for (let i = 0; i < rest.length; i++) {
    if (i > 0 && (rest.length - i) % 2 === 0) buf.push(',')
    buf.push(rest[i])
  }
  return `${negative}₹${buf.join('')},${last3}`
}

export function generateBOQItems(estimation: any): BOQItem[] {
  const m = estimation.materials || {}
  const c = estimation.cost_breakdown || estimation.cost || {}
  const p = estimation.user_inputs || {}
  const rooms = estimation.room_takeoffs || []

  const items: BOQItem[] = []
  let index = 1

  const add = (
    category: string,
    desc: string,
    isCode: string,
    formula: string,
    qtyVal: any,
    unit: string,
    defaultRate: number,
    costVal: any,
    wastePct = 5,
    gstPct = 18
  ) => {
    const qty = safeNum(qtyVal)
    let amount = safeNum(costVal)
    let rate = (qty > 0 && amount > 0) ? Math.round((amount / qty) * 100) / 100 : defaultRate

    // Safeguard: If rate is 0, NaN, or unrealistically small (< 30% of benchmark rate), use defaultRate
    if (rate <= 0 || !isFinite(rate) || isNaN(rate) || (qty > 0 && rate < defaultRate * 0.3)) {
      rate = defaultRate
      amount = Math.round(qty * defaultRate)
    }

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

  // 1. Earthwork & Foundations
  const excVol = safeNum(m.excavation_volume, 45)
  add('1. EARTHWORK & FOUNDATIONS', 'Earthwork Excavation for columns & foundation pits', 'IS 1200 (Part 1)', 'V = Envelope Area × Plinth Height', excVol, 'm³', 200, c.excavation_cost, 0, 18)
  add('1. EARTHWORK & FOUNDATIONS', 'Backfilling and soil compaction with selected earth', 'IS 1200 (Part 1)', 'V_backfill = V_excavation × 0.85', excVol * 0.85, 'm³', 120, Math.round(excVol * 0.85 * 120), 0, 18)

  // 2. Structural RCC
  const concVol = safeNum(m.concrete_volume, 38.5)
  const steelW = safeNum(m.steel_weight, 3270)
  add('2. STRUCTURAL RCC (REINFORCED CONCRETE)', `RCC frame structures - Concrete (${p.concrete_grade || 'M20'} Grade)`, 'IS 1200 (Part 2) / IS 456', 'V_RCC = V_slabs + V_columns + V_beams + V_footings', concVol, 'm³', 5500, c.concrete_cost, p.waste_concrete ?? 2, 18)
  add('2. STRUCTURAL RCC (REINFORCED CONCRETE)', `TMT steel reinforcement bars (${p.steel_grade || 'Fe500'} Grade)`, 'IS 1786 / IS 2502', 'W_steel = ∑(V_member × Rebar Density kg/m³)', steelW, 'kg', 75, c.steel_cost, p.waste_steel ?? 3, 18)
  add('2. STRUCTURAL RCC (REINFORCED CONCRETE)', 'Centering and shuttering (Formwork for slabs, columns & beams)', 'IS 1200 (Part 5)', 'Area = Formwork Surface Area = V_RCC × 4.5', concVol * 4.5, 'm²', 380, c.shuttering_cost || Math.round(concVol * 4.5 * 380), 5, 18)

  // 3. Masonry & Wall Construction
  const brickQty = safeNum(m.bricks_count || m.blocks_count, 14500)
  const brickUnit = m.bricks_count ? 'nos' : 'nos (AAC)'
  const isAAC = p.brick_type === 'aac_block'
  const brickCost = isAAC ? safeNum(c.block_cost) : safeNum(c.brick_cost)
  add('3. MASONRY & WALL CONSTRUCTION', isAAC ? 'AAC Light Wall Blocks (600×200×200mm)' : 'Clay brick masonry in CM 1:6 wall structures', 'IS 1200 (Part 3) / IS 2212', 'Count = Net Wall Vol ÷ Unit Vol with Mortar', brickQty, brickUnit, 10, brickCost, p.waste_brick ?? 5, 18)
  add('3. MASONRY & WALL CONSTRUCTION', 'Cement (OPC 53 Grade) for mortar mix', 'IS 456 / IS 10262', 'Bags = Mortar Vol + RCC Vol', safeNum(m.cement_bags, 340), 'bags', 430, c.cement_cost, 5, 18)
  add('3. MASONRY & WALL CONSTRUCTION', 'River sand / Manufactured sand (M-Sand)', 'IS 383', 'Vol = Mortar Vol × Sand Ratio × Bulking', safeNum(m.sand_volume, 24.5), 'm³', 1400, c.sand_cost, 5, 18)
  add('3. MASONRY & WALL CONSTRUCTION', 'Crushed stone aggregate 20mm', 'IS 383', 'Vol = RCC Concrete Vol × Agg Mix Fraction', safeNum(m.aggregate_volume, 32), 'm³', 1600, c.aggregate_cost, 5, 18)

  // 4. Finishing & Plastering Works
  add('4. FINISHING & PLASTERING WORKS', 'Cement plastering 12mm thick CM 1:4 internal walls', 'IS 1200 (Part 12) / IS 1661', 'Area = Wall Surface Faces - Openings', safeNum(m.plaster_area, 480), 'm²', 280, c.plaster_cost, p.waste_plaster ?? 5, 18)
  add('4. FINISHING & PLASTERING WORKS', 'Emulsion interior wall painting (2 coats over 1 coat primer)', 'IS 1200 (Part 13)', 'Area = Plastered Surface Area', safeNum(m.paint_area, 580), 'm²', 120, c.paint_cost, p.waste_paint ?? 10, 18)
  add('4. FINISHING & PLASTERING WORKS', 'Vitrified floor tiles (600mm × 600mm) including base mortar', 'IS 1200 (Part 11) / IS 15622', 'Boxes = Carpet Area ÷ Coverage', safeNum(m.tiles_area, 61), 'm²', 650, c.tiles_cost, p.waste_tiles ?? 8, 18)
  add('4. FINISHING & PLASTERING WORKS', 'Liquid membrane waterproofing for bathrooms & roof slabs', 'IS 1200 (Part 11)', 'Area = Wet Areas / Roof Surfaces', safeNum(m.waterproofing_area, 75), 'm²', 380, c.waterproofing_cost, 5, 18)

  // 5. Doors, Windows & Openings
  const doorsCount = safeNum(m.doors_count, 4)
  const windowsCount = safeNum(m.windows_count, 6)
  add('5. DOORS, WINDOWS & OPENINGS', 'Wooden flush doors with frames and standard hardware fittings', 'IS 1200 (Part 8)', 'Count = Detected Door Openings', doorsCount, 'nos', 8500, c.door_cost || (doorsCount * 8500), 0, 18)
  add('5. DOORS, WINDOWS & OPENINGS', 'UPVC sliding window frames with 5mm clear float glass', 'IS 1200 (Part 8)', 'Count = Detected Window Openings', windowsCount, 'nos', 6200, c.window_cost || (windowsCount * 6200), 0, 18)

  // 6. Electrical & Plumbing Lines
  const roomPoints = rooms.length || 4
  const wetRooms = rooms.filter((r: any) => r.room_type === 'bathroom' || r.room_type === 'kitchen').length || 2
  add('6. ELECTRICAL & PLUMBING LINES', 'Concealed PVC conduit wiring with modular switches & MCBs', 'IS 1200 (Part 14)', 'Points = Total Detected Rooms', roomPoints, 'point', 3200, c.electrical_cost || (roomPoints * 3200), 0, 18)
  add('6. ELECTRICAL & PLUMBING LINES', 'Internal plumbing lines (CPVC water inlet & PVC drainage pipes)', 'IS 1200 (Part 16)', 'Jobs = Kitchen + Bathroom count', wetRooms, 'job', 24000, c.plumbing_cost || (wetRooms * 24000), 0, 18)

  return items
}

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-TAB EXCEL WORKBOOK EXPORT (REFERENCE 1 FORMAT)
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
  ws['A1'] = {
    t: 's',
    v: 'BuildWise AI — Construction BOQ Report',
    s: {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFFFF' } },
      fill: { fgColor: { rgb: '7B5EA7' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  }

  // Row 2 Subtitle
  const dateStr = new Date().toLocaleDateString()
  ws['A2'] = {
    t: 's',
    v: `Project: ${projectName} | Date: ${dateStr}`,
    s: {
      font: { sz: 10, color: { rgb: 'FFFFFFFF' } },
      fill: { fgColor: { rgb: '4F3B8C' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  }

  // Row 4 Table Headers
  const headers = ['Sl No', 'Item Description', 'Unit', 'Quantity', 'Rate (₹)', 'Amount (₹)']
  headers.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIdx })
    ws[cellRef] = {
      t: 's',
      v: h,
      s: {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: '4F3B8C' } },
        alignment: {
          horizontal: colIdx === 0 || colIdx === 2 ? 'center' : colIdx >= 3 ? 'right' : 'left',
          vertical: 'center'
        }
      }
    }
  })

  let currentRow = 4
  const amountCellRefs: string[] = []
  let globalSlNo = 1

  sections.forEach(sec => {
    if (!sec.items || sec.items.length === 0) return

    // Category Header Row
    ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } })
    const catCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
    ws[catCell] = {
      t: 's',
      v: sec.name.toUpperCase(),
      s: {
        font: { bold: true, color: { rgb: '4A0082' } },
        fill: { fgColor: { rgb: 'E8E2F5' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
    }

    // Fill remaining cells in merged category row with background fill
    for (let c = 1; c <= 5; c++) {
      const emptyCell = XLSX.utils.encode_cell({ r: currentRow, c })
      ws[emptyCell] = {
        t: 's',
        v: '',
        s: { fill: { fgColor: { rgb: 'E8E2F5' } } }
      }
    }

    currentRow++

    sec.items.forEach(item => {
      const rIdx = currentRow + 1
      const safeQty = safeNum(item.qty)
      const safeRateVal = safeNum(item.rate, 0)
      const resolvedRate = (safeRateVal > 0 && isFinite(safeRateVal)) ? safeRateVal : 100
      const slNum = typeof item.sl === 'number' ? item.sl : globalSlNo++

      // Col A: Sl No
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = {
        t: 'n',
        v: slNum,
        s: { alignment: { horizontal: 'center', vertical: 'center' } }
      }

      // Col B: Item Description
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = {
        t: 's',
        v: String(item.desc || ''),
        s: { alignment: { horizontal: 'left', vertical: 'center', wrapText: true } }
      }

      // Col C: Unit
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = {
        t: 's',
        v: String(item.unit || ''),
        s: { alignment: { horizontal: 'center', vertical: 'center' } }
      }

      // Col D: Quantity
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 3 })] = {
        t: 'n',
        v: safeQty,
        z: '#,##0.##',
        s: { alignment: { horizontal: 'right', vertical: 'center' } }
      }

      // Col E: Rate (₹)
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = {
        t: 'n',
        v: resolvedRate,
        z: '"₹"#,##0.00',
        s: { alignment: { horizontal: 'right', vertical: 'center' } }
      }

      // Col F: Amount (₹) — Formula D*E
      const amtCell = XLSX.utils.encode_cell({ r: currentRow, c: 5 })
      ws[amtCell] = {
        t: 'n',
        f: `D${rIdx}*E${rIdx}`,
        z: '"₹"#,##0.00',
        s: { alignment: { horizontal: 'right', vertical: 'center' } }
      }
      amountCellRefs.push(amtCell)
      currentRow++
    })
  })

  // Empty Spacer Row
  currentRow++

  // Helper for Merged Summary Rows (Initializes cells A-E to prevent Excel OpenXML repair warnings)
  const addMergedSummaryRow = (label: string, valOrFormula: any, isFormula = false, customStyle: any = null) => {
    ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } })
    const labelCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
    ws[labelCell] = customStyle ? { t: 's', v: label, s: customStyle } : { t: 's', v: label }

    for (let c = 1; c <= 4; c++) {
      const emptyCell = XLSX.utils.encode_cell({ r: currentRow, c })
      ws[emptyCell] = customStyle ? { t: 's', v: '', s: customStyle } : { t: 's', v: '' }
    }

    const valCell = XLSX.utils.encode_cell({ r: currentRow, c: 5 })
    if (isFormula) {
      ws[valCell] = customStyle ? { t: 'n', f: String(valOrFormula), z: '"₹"#,##0.00', s: customStyle } : { t: 'n', f: String(valOrFormula), z: '"₹"#,##0.00' }
    } else {
      ws[valCell] = customStyle ? { t: 'n', v: safeNum(valOrFormula), z: '"₹"#,##0.00', s: customStyle } : { t: 'n', v: safeNum(valOrFormula), z: '"₹"#,##0.00' }
    }
    currentRow++
  }

  // BOQ SUMMARY BREAKDOWN
  addMergedSummaryRow(
    'BOQ SUMMARY BREAKDOWN',
    '',
    false,
    { font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: '2E7D32' } }, alignment: { horizontal: 'left', vertical: 'center' } }
  )

  const firstAmtRef = amountCellRefs[0] || 'F5'
  const lastAmtRef = amountCellRefs[amountCellRefs.length - 1] || 'F5'

  // Material Takeoff Cost
  const matRow = currentRow
  addMergedSummaryRow('Material Takeoff Cost', `SUM(${firstAmtRef}:${lastAmtRef})`, true)

  // Labour Takeoff Cost
  addMergedSummaryRow('Labour Takeoff Cost', safeNum(summaryCosts.labour, 330000))

  // Machinery & Rental Equipment
  addMergedSummaryRow('Machinery & Rental Equipment', safeNum(summaryCosts.equipment, 55000))

  // Overhead & Contractor Margin
  addMergedSummaryRow('Overhead & Contractor Margin', safeNum(summaryCosts.margin, 155000))

  // Contingency Buffer
  const contRow = currentRow
  addMergedSummaryRow('Contingency Buffer', safeNum(summaryCosts.contingency, 77000))

  const subtotalStart = matRow
  const subtotalEnd = contRow

  // GST (18% applied)
  const gstRow = currentRow
  addMergedSummaryRow('GST (18% applied)', `SUM(F${subtotalStart}:F${subtotalEnd})*0.18`, true)

  // GRAND TOTAL CONTRACT AMOUNT
  addMergedSummaryRow(
    'GRAND TOTAL CONTRACT AMOUNT',
    `SUM(F${subtotalStart}:F${gstRow})`,
    true,
    { font: { bold: true, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: '1B5E20' } } }
  )

  ws['!cols'] = [
    { wch: 8 },  // A: Sl No
    { wch: 48 }, // B: Description
    { wch: 10 }, // C: Unit
    { wch: 14 }, // D: Quantity
    { wch: 16 }, // E: Rate
    { wch: 22 }  // F: Amount
  ]

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: 5 } })
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4, activePane: 'bottomLeft' }]
  ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9 }

  return ws
}

export function exportToExcel(estimation: any, projectName: string) {
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}
  const rooms = estimation.room_takeoffs || []

  const workbook = XLSX.utils.book_new()

  // Sheet 1: Styled Construction BOQ Report
  const categoriesMap = new Map<string, any[]>()
  items.forEach(item => {
    const cat = item.category || 'A. EARTHWORK'
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, [])
    categoriesMap.get(cat)!.push({
      sl: item.srNo,
      desc: item.description,
      unit: item.unit,
      qty: safeNum(item.quantity),
      rate: safeNum(item.rate)
    })
  })

  const formattedSections = Array.from(categoriesMap.entries()).map(([name, catItems]) => ({
    name,
    items: catItems
  }))

  const boqSheet = buildBOQWorksheet(projectName, formattedSections, {
    labour: safeNum(c.labour_cost),
    equipment: safeNum(c.equipment_cost),
    margin: safeNum(c.contractor_margin),
    contingency: safeNum(c.contingency)
  })

  XLSX.utils.book_append_sheet(workbook, boqSheet, 'BOQ Report')

  // Sheet 2: Executive Summary
  const summaryData = [
    ['BUILDWISE AI — EXECUTIVE BOQ ESTIMATION REPORT'],
    ['Project Name', projectName],
    ['Project ID', estimation.project_id || estimation.id || 'PROJ-DEMO'],
    ['Generated Date', new Date().toLocaleDateString()],
    ['IS Code Standard', 'IS 1200 / IS 456 / IS 1786 / IS 2502'],
    ['Software Version', 'BuildWise AI Enterprise 2.5'],
    [],
    ['COST SUMMARY BREAKDOWN'],
    ['Direct Material Cost', safeNum(c.total_material_cost)],
    ['Direct Craft Labour Wages', safeNum(c.labour_cost)],
    ['Equipment & Machinery Rentals', safeNum(c.equipment_cost)],
    ['Contractor Overheads & Margin', safeNum(c.contractor_margin)],
    ['Contingency Buffer', safeNum(c.contingency)],
    ['GST Tax Amount (18%)', safeNum(c.gst_amount)],
    ['GRAND TOTAL PROJECT COST', safeNum(c.grand_total || estimation.total_cost)]
  ]
  const sheetSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, sheetSummary, 'Executive Summary')

  // Sheet 3: Room Takeoffs
  if (rooms && rooms.length > 0) {
    const roomRows = rooms.map((r: any) => ({
      'Room Name': String(r.label || r.room_name || ''),
      'Carpet Area (m²)': safeNum(r.area_m2),
      'Perimeter (m)': safeNum(r.perimeter_m),
      'Wall Surface Area (m²)': safeNum(r.wall_area_m2),
      'Floor Tiles Boxes': safeNum(r.flooring_tile_boxes || r.tiles_boxes),
      'Paint Volume (Ltrs)': safeNum(r.paint_liters),
      'Total Room Cost (INR)': safeNum(r.total_cost || r.subtotal)
    }))
    const sheetRooms = XLSX.utils.json_to_sheet(roomRows)
    XLSX.utils.book_append_sheet(workbook, sheetRooms, 'Room Takeoffs')
  }

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
    ...items.map(i => [i.srNo, i.category, i.description, i.isCode, i.formula, safeNum(i.quantity), i.unit, safeNum(i.rate), safeNum(i.amount)]),
    [],
    ['Total Material Cost', '', '', '', '', '', '', '', safeNum(c.total_material_cost)],
    ['Labour Cost', '', '', '', '', '', '', '', safeNum(c.labour_cost)],
    ['Equipment Cost', '', '', '', '', '', '', '', safeNum(c.equipment_cost)],
    ['Contractor Margin', '', '', '', '', '', '', '', safeNum(c.contractor_margin)],
    ['GST 18%', '', '', '', '', '', '', '', safeNum(c.gst_amount)],
    ['Grand Total', '', '', '', '', '', '', '', safeNum(c.grand_total || estimation.total_cost)]
  ]

  const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `BOQ_Report_${projectName.replace(/\s+/g, '_')}.csv`)
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT TO PROFESSIONAL PDF (WITH DIGITAL SIGNATURE BLOCK)
// ══════════════════════════════════════════════════════════════════════════════

export function exportToPDF(estimation: any, projectName: string, floorPlanImageUrl?: string) {
  const doc = new jsPDF()
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}

  // Header styling
  doc.setFontSize(20)
  doc.setTextColor(124, 58, 237) // violet-600
  doc.text('BuildWise AI', 14, 20)

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Enterprise Construction BOQ & Takeoff Audit Report (IS 1200 / IS 456)', 14, 26)
  doc.text(`Project: ${projectName} | ID: ${estimation.project_id || estimation.id || 'PROJ-DEMO'}`, 14, 31)
  doc.text(`Date: ${new Date().toLocaleDateString()} | Calculation Engine: v2.5 IS-Compliant`, 14, 36)

  doc.line(14, 39, 196, 39)

  // Table 1: BOQ Items
  const columns = ['Sr', 'Category', 'Description', 'IS Code', 'Qty', 'Unit', 'Rate', 'Amount (INR)']
  const rows = items.map(i => [
    i.srNo,
    i.category,
    i.description,
    i.isCode,
    safeNum(i.quantity),
    i.unit,
    safeNum(i.rate).toLocaleString('en-IN'),
    safeNum(i.amount).toLocaleString('en-IN')
  ])

  autoTable(doc, {
    startY: 43,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237], halign: 'left', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 45 },
      3: { cellWidth: 30 },
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

  const addSummaryRow = (label: string, val: number) => {
    doc.text(label, 14, currentY)
    doc.text(`Rs. ${safeNum(val).toLocaleString('en-IN')}`, 196, currentY, { align: 'right' })
    currentY += 5
  }

  const matCost = items.reduce((sum, item) => sum + safeNum(item.amount), 0)
  const labourCost = safeNum(c.labour_cost, 330000)
  const equipCost = safeNum(c.equipment_cost, 55000)
  const marginCost = safeNum(c.contractor_margin, 155000)
  const contingencyCost = safeNum(c.contingency, 77000)

  const subtotal = matCost + labourCost + equipCost + marginCost + contingencyCost
  const gstAmount = Math.round(subtotal * 0.18)
  const grandTotal = subtotal + gstAmount

  addSummaryRow('Direct Material Cost:', matCost)
  addSummaryRow('Direct Craft Labour Wages:', labourCost)
  addSummaryRow('Equipment & Machinery Rentals:', equipCost)
  addSummaryRow('Contractor Margin & Overheads:', marginCost)
  addSummaryRow('Contingency Buffer:', contingencyCost)
  addSummaryRow('GST Tax Amount (18%):', gstAmount)

  doc.line(14, currentY, 196, currentY)
  currentY += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(124, 58, 237)
  doc.text('GRAND TOTAL ESTIMATE:', 14, currentY)
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, 196, currentY, { align: 'right' })

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

  // Embed Floor Plan Drawing Page if available
  if (floorPlanImageUrl && (floorPlanImageUrl.startsWith('data:image') || floorPlanImageUrl.startsWith('http'))) {
    try {
      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(124, 58, 237)
      doc.text('BuildWise AI — Floor Plan Drawing', 14, 20)
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Project: ${projectName} | AI Processed Geometry Blueprint`, 14, 26)
      doc.line(14, 30, 196, 30)

      const fmt = floorPlanImageUrl.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(floorPlanImageUrl, fmt, 14, 35, 180, 130)

      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text('Fig 1.1: Processed Floor Plan Drawing showing rooms, detected wall segments, doors, and windows.', 14, 172)
    } catch (e) {
      console.warn('Could not embed floor plan image in PDF:', e)
    }
  }

  doc.save(`BOQ_Report_${projectName.replace(/\s+/g, '_')}.pdf`)
}
