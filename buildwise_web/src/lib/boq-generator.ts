import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface BOQItem {
  srNo: number
  description: string
  quantity: number
  unit: string
  rate: number
  amount: number
  category: string
}

export function generateBOQItems(estimation: any): BOQItem[] {
  const m = estimation.materials
  const c = estimation.cost_breakdown || estimation.cost || {}
  
  const items: BOQItem[] = []
  let index = 1

  const add = (desc: string, qty: number, unit: string, rate: number, amount: number, category: string) => {
    if (qty > 0 || amount > 0) {
      items.push({
        srNo: index++,
        description: desc,
        quantity: Math.round(qty * 100) / 100,
        unit,
        rate: Math.round(rate * 100) / 100,
        amount: Math.round(amount),
        category,
      })
    }
  }

  // 1. Structural RCC
  add('Concrete RCC Structural Mix (slab, beam, columns, foundation)', m.concrete_volume || 0, 'm³', c.concrete_cost / (m.concrete_volume || 1), c.concrete_cost || 0, 'Structural RCC')
  add('TMT Steel Reinforcement (high-strength reinforcing bars)', m.steel_weight || 0, 'kg', c.steel_cost / (m.steel_weight || 1), c.steel_cost || 0, 'Structural RCC')
  add('Cement Bags (OPC 53 Grade / PPC premium brands)', m.cement_bags || 0, 'bags', c.cement_cost / (m.cement_bags || 1), c.cement_cost || 0, 'Structural RCC')
  add('Sand coarse aggregate supply', m.sand_volume || 0, 'm³', c.sand_cost / (m.sand_volume || 1), c.sand_cost || 0, 'Structural RCC')
  add('Stone Aggregate (10mm / 20mm coarse aggregates)', m.aggregate_volume || 0, 'm³', c.aggregate_cost / (m.aggregate_volume || 1), c.aggregate_cost || 0, 'Structural RCC')
  add('Shuttering / Formwork area (slab, beam, column centering)', m.shuttering?.total_area_m2 || 0, 'm²', m.shuttering?.rate_per_m2 || 150, c.shuttering_cost || m.shuttering?.total_cost || 0, 'Structural RCC')

  // 2. Masonry
  const brickQty = m.bricks_count || m.blocks_count || 0
  const brickUnit = m.bricks_count ? 'nos' : 'nos (AAC)'
  const brickRate = m.bricks_count ? (c.brick_cost / (m.bricks_count || 1)) : (c.block_cost / (m.blocks_count || 1))
  const brickCost = c.brick_cost || c.block_cost || 0
  add('Masonry brickwork wall units', brickQty, brickUnit, brickRate, brickCost, 'Masonry & Partition')
  add('Mortar wet mix for brickwork jointing', m.mortar_volume || 0, 'm³', c.mortar_cost / (m.mortar_volume || 1), c.mortar_cost || 0, 'Masonry & Partition')

  // 3. MEP (Plumbing & Electrical)
  add('Internal & External Plumbing Piping network (water/drainage)', 1, 'L.S.', c.plumbing_cost || 0, c.plumbing_cost || 0, 'Plumbing & Sanitary')
  add('Electrical Wiring, Switches, MCBs, DB infrastructure', 1, 'L.S.', c.electrical_cost || 0, c.electrical_cost || 0, 'Electrical & Fittings')

  // 4. Finishes
  add('Mortar Plaster Wall Finish (internal/external double coat)', m.plaster_area || 0, 'm²', c.plaster_cost / (m.plaster_area || 1), c.plaster_cost || 0, 'Finishes & Paint')
  add('Wall Premium Decorative Painting (primer/putty/emulsion)', m.paint_area || 0, 'm²', c.paint_cost / (m.paint_area || 1), c.paint_cost || 0, 'Finishes & Paint')
  add('Flooring Tiles (ceramic/vitrified flooring with adhesive/grout)', m.tiles_area || 0, 'm²', c.tiles_cost / (m.tiles_area || 1), c.tiles_cost || 0, 'Finishes & Paint')
  add('Waterproofing Barrier Layer chemical coat (terrace/bathroom)', m.waterproofing_area || 0, 'm²', c.waterproofing_cost / (m.waterproofing_area || 1), c.waterproofing_cost || 0, 'Finishes & Paint')

  // 5. Openings & Earthwork
  add('Earthwork Excavation for isolated/raft foundations', m.excavation_volume || 0, 'm³', c.excavation_cost / (m.excavation_volume || 1), c.excavation_cost || 0, 'Civil & Earthwork')
  add('Premium Doors with Teakwood/Plywood frames', m.doors?.total_count || 0, 'nos', c.door_cost / (m.doors?.total_count || 1), c.door_cost || 0, 'Openings & Carpentry')
  add('Aluminium sliding / UPVC Windows with glass paneling', m.windows?.total_count || 0, 'nos', c.window_cost / (m.windows?.total_count || 1), c.window_cost || 0, 'Openings & Carpentry')

  return items
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT TO EXCEL
// ══════════════════════════════════════════════════════════════════════════════

export function exportToExcel(estimation: any, projectName: string) {
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}
  
  // Format items for spreadsheet
  const rows = items.map(item => ({
    'Sr No': item.srNo,
    'Component Category': item.category,
    'Item Description': item.description,
    'Estimated Quantity': item.quantity,
    'Measurement Unit': item.unit,
    'Unit Rate (INR)': item.rate,
    'Total Amount (INR)': item.amount,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bill of Quantities')

  // Add summaries to the end
  const nextRowIndex = rows.length + 3
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['Total Material Cost:', '', '', '', '', '', c.total_material_cost || 0],
    ['Craft Labour Cost:', '', '', '', '', '', c.labour_cost || 0],
    ['Machinery & Equipments:', '', '', '', '', '', c.equipment_cost || 0],
    ['Contractor Overheads/Margin:', '', '', '', '', '', c.contractor_margin || 0],
    ['Contingency Buffer:', '', '', '', '', '', c.contingency || 0],
    ['GST Rate Buffer (18%):', '', '', '', '', '', c.gst_amount || 0],
    ['Grand Total Estimate:', '', '', '', '', '', c.grand_total || estimation.total_cost || 0]
  ], { origin: `A${nextRowIndex}` })

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
    ['Sr No', 'Category', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount'],
    ...items.map(i => [i.srNo, i.category, i.description, i.quantity, i.unit, i.rate, i.amount]),
    [],
    ['Total Material Cost', '', '', '', '', '', c.total_material_cost || 0],
    ['Labour Cost', '', '', '', '', '', c.labour_cost || 0],
    ['Equipment Cost', '', '', '', '', '', c.equipment_cost || 0],
    ['GST 18%', '', '', '', '', '', c.gst_amount || 0],
    ['Grand Total', '', '', '', '', '', c.grand_total || estimation.total_cost || 0]
  ]

  const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `BOQ_Report_${projectName.replace(/\s+/g, '_')}.csv`)
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT TO PDF
// ══════════════════════════════════════════════════════════════════════════════

export function exportToPDF(estimation: any, projectName: string) {
  const doc = new jsPDF()
  const items = generateBOQItems(estimation)
  const c = estimation.cost_breakdown || estimation.cost || {}

  // Header styling
  doc.setFontSize(20)
  doc.setTextColor(124, 58, 237) // violet-600
  doc.text('BuildWise AI', 14, 20)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Enterprise Construction BOQ & Takeoff Report', 14, 25)
  doc.text(`Project: ${projectName}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35)

  doc.line(14, 38, 196, 38)

  // Main table
  const columns = ['Sr', 'Category', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount (INR)']
  const rows = items.map(i => [
    i.srNo,
    i.category,
    i.description,
    i.quantity,
    i.unit,
    i.rate.toLocaleString('en-IN'),
    i.amount.toLocaleString('en-IN')
  ])

  autoTable(doc, {
    startY: 42,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237], halign: 'left' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 60 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 15 },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' }
    },
    styles: { fontSize: 8.5 }
  })

  // Summary layout below table
  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  
  let currentY = finalY
  const addSummaryRow = (label: string, val: number) => {
    doc.text(label, 120, currentY)
    doc.text(`Rs. ${val.toLocaleString('en-IN')}`, 196, currentY, { align: 'right' })
    currentY += 6
  }

  addSummaryRow('Total Material Cost:', c.total_material_cost || 0)
  addSummaryRow('Direct Craft Labour:', c.labour_cost || 0)
  addSummaryRow('Equipment & Machinery:', c.equipment_cost || 0)
  addSummaryRow('Contractor Margin:', c.contractor_margin || 0)
  addSummaryRow('Contingency Buffer:', c.contingency || 0)
  addSummaryRow('GST Buffer (18%):', c.gst_amount || 0)
  
  doc.line(120, currentY, 196, currentY)
  currentY += 6
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('GRAND TOTAL BOQ:', 120, currentY)
  doc.text(`Rs. ${(c.grand_total || estimation.total_cost || 0).toLocaleString('en-IN')}`, 196, currentY, { align: 'right' })

  doc.save(`BOQ_Report_${projectName.replace(/\s+/g, '_')}.pdf`)
}
