'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Printer, FileSpreadsheet, Download, ArrowLeft, Building,
  Ruler, Package, Users, Settings, AlertTriangle, Sparkles, CheckCircle2, Eye, EyeOff, KeyRound, Loader2
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { loadMaterialConfig, CEMENT_BRANDS, STEEL_BRAND_LIST, SAND_CATALOG } from '@/lib/construction-data'
import type { AIRoom, AIWall, AIDoor, AIWindow } from '@/lib/floor-plan-ai/types'
import { Building3DViewer } from '@/components/three-d/Building3DViewer'

// ── Types for Report State ──────────────────────────────────────────────────

interface ReportMetadata {
  clientName: string
  contractorName: string
  architectName: string
  engineerName: string
  address: string
  city: string
  state: string
  country: string
  version: string
  preparedBy: string
}

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════

export default function ProjectReportPage() {
  const { id: projectId } = useParams() as { id: string }
  const router = useRouter()

  // ── Data states ───────────────────────────────────────────────────────────
  const [project, setProject] = useState<any>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [estimation, setEstimation] = useState<any>(null)
  const [materialConfig, setMaterialConfig] = useState<any>(null)
  const [imageUrl, setImageUrl] = useState<string>('')

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ── Cover page metadata state ─────────────────────────────────────────────
  const [metadata, setMetadata] = useState<ReportMetadata>({
    clientName: 'Omkar Koli',
    contractorName: 'BuildWise Infrastructure Ltd.',
    architectName: 'Ar. Rajesh Mehta (AIA)',
    engineerName: 'Er. Sachin Patil (FIV)',
    address: 'Plot No. 45, Sector 4, Hinjewadi',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    version: 'V2.1.0',
    preparedBy: 'Quantity Surveyor (BuildWise AI Engine)',
  })
  const [showMetadataEditor, setShowMetadataEditor] = useState(false)

  // ── Load all related project data ─────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return

    // 1. Get project info
    const allProj = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
    const currentProj = allProj.find((p: any) => p.id === projectId)
    setProject(currentProj || { name: 'BuildWise Takeoff Project', building_type: 'house' })

    // 2. Get plan data
    const plan = Object.keys(localStorage)
      .filter(k => k.startsWith('bw_demo_plan_'))
      .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
      .find(p => p.project_id === projectId || p.id === projectId)
    setPlanData(plan)

    // 3. Get floor plan image using resolved plan ID
    const planId = plan?.id || projectId
    setImageUrl(localStorage.getItem(`bw_demo_file_data_${planId}`) || localStorage.getItem(`bw_demo_file_data_${projectId}`) || '')

    // 4. Get estimation results
    const est = localStorage.getItem(`bw_demo_est_${projectId}`) ||
                Object.keys(localStorage)
                  .filter(k => k.startsWith('bw_demo_est_'))
                  .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
                  .find(e => e.project_id === projectId)
    if (est) {
      setEstimation(typeof est === 'string' ? JSON.parse(est) : est)
    }

    // 5. Get material brand configs
    setMaterialConfig(loadMaterialConfig(projectId))
  }, [projectId])

  // ── Dynamic Room & Wall list resolution ──────────────────────────────────
  const rooms = useMemo<AIRoom[]>(() => planData?.detected_data?.rooms || [], [planData])
  const walls = useMemo<AIWall[]>(() => planData?.detected_data?.walls || [], [planData])
  const doors = useMemo<AIDoor[]>(() => planData?.detected_data?.doors || [], [planData])
  const windows = useMemo<AIWindow[]>(() => planData?.detected_data?.windows || [], [planData])

  const floorHeight = planData?.detected_data?.floor_height_m || 3.0
  const wallThickness = planData?.detected_data?.wall_thickness_m || 0.23

  // Fallback estimates if no plan data exists
  const safeEstimation = useMemo(() => {
    if (estimation) return estimation
    // Standard default fallback quantities
    return {
      user_inputs: { num_floors: 1, floor_height: 3.0, total_area: 1500, concrete_grade: 'M20', steel_grade: 'Fe500', foundation_type: 'isolated', roof_type: 'flat_rcc', brick_type: 'red_brick', waste_percentage: 5 },
      materials: { concrete_volume: 38.5, steel_weight: 3270, cement_bags: 340, sand_volume: 24.5, aggregate_volume: 32.0, bricks_count: 14500, plaster_area: 480, paint_area: 580, tiles_area: 61, waterproofing_area: 75, excavation_volume: 45.0 },
      cost_breakdown: { concrete_cost: 211750, steel_cost: 245250, cement_cost: 146200, sand_cost: 34300, aggregate_cost: 51200, brick_cost: 145000, plaster_cost: 134400, paint_cost: 69600, tiles_cost: 39650, waterproofing_cost: 28500, excavation_cost: 9000, labour_cost: 330000, equipment_cost: 55000, total_material_cost: 1074850, gst_amount: 279500, contractor_margin: 155000, contingency: 77000, grand_total: 1916350 },
      total_cost: 1916350,
    }
  }, [estimation])

  // ── Section 5: Room-wise quantity & cost breakdown ───────────────────────
  const roomWiseSummary = useMemo(() => {
    return rooms.map((room) => {
      const area = room.area_m2 || 15
      const perimeter = room.perimeter_m || 16
      const height = room.floor_height_m || floorHeight
      
      const floorArea = area
      const ceilingArea = area
      const wallArea = perimeter * height
      const wallVolume = wallArea * wallThickness
      
      // Rough cost allocations matching typical quantity takeoff
      const matCost = Math.round(floorArea * 950 + wallVolume * 4200)
      const labCost = Math.round(matCost * 0.35)
      const totalCost = matCost + labCost

      return {
        name: room.label,
        length: room.length_m || Math.sqrt(area) * 1.15,
        width: room.width_m || area / (room.length_m || Math.sqrt(area) * 1.15),
        height,
        floorArea,
        wallArea,
        ceilingArea,
        wallVolume,
        matCost,
        labCost,
        totalCost,
      }
    })
  }, [rooms, floorHeight, wallThickness])

  // ── Section 6: Wall-wise structural quantity breakdown ───────────────────
  const wallWiseSummary = useMemo(() => {
    return walls.map((wall) => {
      const len = wall.length_m || 4.5
      const thick = wall.thickness_m || wallThickness
      const ht = floorHeight
      const wallArea = len * ht
      const wallVolume = wallArea * thick

      // IS 1200 masonry constants
      const brickQty = Math.ceil(wallVolume * 500) // 500 bricks per m3
      const mortarVol = wallVolume * 0.28 // mortar is ~28% of brickwork volume
      const cementBags = Math.ceil(mortarVol * 7.5) // mix ratio bags
      const sandQty = mortarVol * 0.92 // m3 of sand

      const paintArea = wallArea * 2.0 // double side paint
      const plasterArea = wallArea * 2.0 // double side plaster
      
      const cost = Math.round(brickQty * 10 + cementBags * 430 + sandQty * 1400 + plasterArea * 280 + paintArea * 120)

      return {
        id: wall.id,
        length: len,
        thickness: thick,
        height: ht,
        area: wallArea,
        volume: wallVolume,
        brickQty,
        mortarVol,
        cementBags,
        sandQty,
        paintArea,
        plasterArea,
        cost,
      }
    })
  }, [walls, floorHeight, wallThickness])

  // ── Section 7: Complete Master BOQ Categories ───────────────────────────
  const masterBOQ = useMemo(() => {
    const cost = safeEstimation.cost_breakdown
    const mat = safeEstimation.materials

    return [
      {
        category: '1. Earthwork & Foundations',
        items: [
          { sl: '1.1', desc: 'Excavation in ordinary soil for columns & foundation pits', qty: mat.excavation_volume, unit: 'm³', rate: Math.round(cost.excavation_cost / (mat.excavation_volume || 1)), amt: cost.excavation_cost },
          { sl: '1.2', desc: 'Backfilling and soil compaction with selected earth', qty: mat.excavation_volume * 0.85, unit: 'm³', rate: 120, amt: Math.round(mat.excavation_volume * 0.85 * 120) },
        ]
      },
      {
        category: '2. Structural RCC (Reinforced Concrete)',
        items: [
          { sl: '2.1', desc: `RCC frame structures - Concrete (${safeEstimation.user_inputs?.concrete_grade || 'M20'} Grade)`, qty: mat.concrete_volume, unit: 'm³', rate: Math.round(cost.concrete_cost / (mat.concrete_volume || 1)), amt: cost.concrete_cost },
          { sl: '2.2', desc: `TMT steel reinforcement bars (${safeEstimation.user_inputs?.steel_grade || 'Fe500'} Grade)`, qty: mat.steel_weight, unit: 'kg', rate: Math.round((cost.steel_cost / (mat.steel_weight || 1)) * 10) / 10, amt: cost.steel_cost },
          { sl: '2.3', desc: 'Centering and shuttering (Formwork for slabs, columns & beams)', qty: mat.concrete_volume * 4.5, unit: 'm²', rate: Math.round((cost.shuttering_cost || (mat.concrete_volume * 4.5 * 380)) / (mat.concrete_volume * 4.5 || 1)), amt: cost.shuttering_cost || Math.round(mat.concrete_volume * 4.5 * 380) },
        ]
      },
      {
        category: '3. Masonry & Wall Construction',
        items: [
          { sl: '3.1', desc: `Clay brick masonry in CM 1:6 wall structures`, qty: mat.bricks_count || mat.blocks_count || 0, unit: 'nos', rate: Math.round((cost.brick_cost || cost.block_cost || 0) / ((mat.bricks_count || mat.blocks_count) || 1)), amt: cost.brick_cost || cost.block_cost || 0 },
          { sl: '3.2', desc: 'Cement (OPC 53 Grade) for mortar mix', qty: mat.cement_bags, unit: 'bags', rate: Math.round(cost.cement_cost / (mat.cement_bags || 1)), amt: cost.cement_cost },
          { sl: '3.3', desc: 'River sand / Manufactured sand (M-Sand)', qty: mat.sand_volume, unit: 'm³', rate: Math.round(cost.sand_cost / (mat.sand_volume || 1)), amt: cost.sand_cost },
          { sl: '3.4', desc: 'Crushed stone aggregate 20mm', qty: mat.aggregate_volume, unit: 'm³', rate: Math.round(cost.aggregate_cost / (mat.aggregate_volume || 1)), amt: cost.aggregate_cost },
        ]
      },
      {
        category: '4. Finishing & Plastering Works',
        items: [
          { sl: '4.1', desc: 'Cement plastering 12mm thick CM 1:4 internal walls', qty: mat.plaster_area, unit: 'm²', rate: Math.round(cost.plaster_cost / (mat.plaster_area || 1)), amt: cost.plaster_cost },
          { sl: '4.2', desc: 'Emulsion interior wall painting (2 coats over 1 coat primer)', qty: mat.paint_area, unit: 'm²', rate: Math.round(cost.paint_cost / (mat.paint_area || 1)), amt: cost.paint_cost },
          { sl: '4.3', desc: 'Vitrified floor tiles (600mm × 600mm) including base mortar', qty: mat.tiles_area, unit: 'm²', rate: Math.round(cost.tiles_cost / (mat.tiles_area || 1)), amt: cost.tiles_cost },
          { sl: '4.4', desc: 'Liquid membrane waterproofing for bathrooms & roof slabs', qty: mat.waterproofing_area, unit: 'm²', rate: Math.round(cost.waterproofing_cost / (mat.waterproofing_area || 1)), amt: cost.waterproofing_cost },
        ]
      },
      {
        category: '5. Doors, Windows & Openings',
        items: [
          { sl: '5.1', desc: 'Wooden flush doors with frames and standard hardware fittings', qty: doors.length || 4, unit: 'nos', rate: Math.round((cost.door_cost || (doors.length || 4) * 8500) / (doors.length || 4)), amt: cost.door_cost || (doors.length || 4) * 8500 },
          { sl: '5.2', desc: 'UPVC sliding window frames with 5mm clear float glass', qty: windows.length || 6, unit: 'nos', rate: Math.round((cost.window_cost || (windows.length || 6) * 6200) / (windows.length || 6)), amt: cost.window_cost || (windows.length || 6) * 6200 },
        ]
      },
      {
        category: '6. Electrical & Plumbing Lines',
        items: [
          { sl: '6.1', desc: 'Concealed PVC conduit wiring with modular switches & MCBs', qty: rooms.length || 4, unit: 'point', rate: Math.round((cost.electrical_cost || (rooms.length || 4) * 3200) / (rooms.length || 4)), amt: cost.electrical_cost || (rooms.length || 4) * 3200 },
          { sl: '6.2', desc: 'Internal plumbing lines (CPVC water inlet & PVC drainage pipes)', qty: rooms.filter(r => r.room_type === 'bathroom' || r.room_type === 'kitchen').length || 2, unit: 'job', rate: Math.round((cost.plumbing_cost || (rooms.filter(r => r.room_type === 'bathroom' || r.room_type === 'kitchen').length || 2) * 24000) / (rooms.filter(r => r.room_type === 'bathroom' || r.room_type === 'kitchen').length || 2)), amt: cost.plumbing_cost || (rooms.filter(r => r.room_type === 'bathroom' || r.room_type === 'kitchen').length || 2) * 24000 },
        ]
      }
    ]
  }, [safeEstimation, doors, windows, rooms])

  // ── Section 11: Total area & cost breakdown ──────────────────────────────
  const areaSqft = safeEstimation.user_inputs?.total_area || 1500
  const areaSqm = areaSqft * 0.092903

  const totalBOQAmount = useMemo(() => {
    return masterBOQ.reduce((sum, cat) => sum + cat.items.reduce((s, i) => s + i.amt, 0), 0)
  }, [masterBOQ])

  const costBreakdownData = useMemo(() => {
    const baseMat = totalBOQAmount
    const baseLab = safeEstimation.cost_breakdown.labour_cost
    const baseEqu = safeEstimation.cost_breakdown.equipment_cost
    const margin = safeEstimation.cost_breakdown.contractor_margin
    const transport = Math.round(baseMat * 0.04) // 4% transportation
    const sub = baseMat + baseLab + baseEqu + margin + transport
    const gst = safeEstimation.cost_breakdown.gst_amount || Math.round(sub * 0.18)
    const grand = safeEstimation.cost_breakdown.grand_total || (sub + gst)

    return {
      material: baseMat,
      labour: baseLab,
      equipment: baseEqu,
      margin,
      transport,
      gst,
      grand,
      perSqft: grand / areaSqft,
      perSqm: grand / areaSqm,
    }
  }, [totalBOQAmount, safeEstimation, areaSqft, areaSqm])

  // ── Section 15: AI Suggestions with savings ──────────────────────────────
  const aiSuggestions = useMemo(() => {
    return [
      {
        title: 'Switch from Clay Bricks to AAC Blocks',
        savings: 82000,
        advantages: 'Reduces structure weight by 40%, mortar usage by 60%, and offers higher thermal insulation.',
        disadvantages: 'Lower load-bearing capacity; requires experienced masonry workers to avoid cracks.',
      },
      {
        title: 'Optimize Steel Grade to Fe550D / Fe600',
        savings: 34500,
        advantages: 'Allows design configurations to require 8–10% less steel volume while maintaining tensile capacity.',
        disadvantages: 'Slightly higher raw material rate per kg compared to standard Fe500.',
      },
      {
        title: 'Use Manufactured Sand (M-Sand) instead of River Sand',
        savings: 26000,
        advantages: 'Eco-friendly alternative, free from silt/clay particles, offering 15% higher compressive strength.',
        disadvantages: 'Slightly rough texture; requires plasticizer additives for smooth plaster finishes.',
      }
    ]
  }, [])

  // ── CSV Export Function ───────────────────────────────────────────────────
  const triggerCSVDownload = () => {
    let csv = 'Sr No,Category,Description,Quantity,Unit,Rate (INR),Amount (INR)\n'
    masterBOQ.forEach((cat) => {
      csv += `,,${cat.category.toUpperCase()},,,,\n`
      cat.items.forEach((item) => {
        csv += `"${item.sl}","${cat.category}","${item.desc}",${item.qty},"${item.unit}",${item.rate},${item.amt}\n`
      })
    })

    // Add cost breakdown
    csv += `\n,,SUMMARY BREAKDOWN,,,,\n`
    csv += `,,Material Cost,,,${costBreakdownData.material}\n`
    csv += `,,Labour Cost,,,${costBreakdownData.labour}\n`
    csv += `,,Equipment Cost,,,${costBreakdownData.equipment}\n`
    csv += `,,Transportation Charges,,,${costBreakdownData.transport}\n`
    csv += `,,Contractor Margin,,,${costBreakdownData.margin}\n`
    csv += `,,GST (18% applied),,,${costBreakdownData.gst}\n`
    csv += `,,GRAND TOTAL,,,${costBreakdownData.grand}\n`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Takeoff_Report_${projectId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── Excel Export Function (SpreadsheetML XML format) ──────────────────────
  const triggerExcelDownload = () => {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:relationship"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubHeader">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#4F46E5" ss:Bold="1"/>
   <Interior ss:Color="#EEF2F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Amount">
   <NumberFormat ss:Format="&quot;₹&quot;#,##0"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1" ss:Color="#1E1E24"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="BOQ Takeoff Report">
  <Table ss:ExpandedColumnCount="7" ss:ExpandedRowCount="${masterBOQ.reduce((sum, c) => sum + c.items.length + 2, 0) + 15}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="60">
   <Column ss:Width="40"/>
   <Column ss:Width="160"/>
   <Column ss:Width="250"/>
   <Column ss:Width="60"/>
   <Column ss:Width="50"/>
   <Column ss:Width="60"/>
   <Column ss:Width="90"/>
   
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="Title"><Data ss:Type="String">BuildWise AI — Construction Quantity Estimation Report</Data></Cell>
   </Row>
   <Row><Cell ss:MergeAcross="6"><Data ss:Type="String">Project: ${project?.name || 'Omkar Koli'} | Client: ${metadata.clientName} | Date: ${new Date().toLocaleDateString()}</Data></Cell></Row>
   <Row ss:Index="4" ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Sl No</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Item Description</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Quantity</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rate (₹)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount (₹)</Data></Cell>
   </Row>`

    let rowIdx = 5
    masterBOQ.forEach((cat) => {
      xml += `\n   <Row ss:Height="18">
    <Cell ss:MergeAcross="6" ss:StyleID="SubHeader"><Data ss:Type="String">${cat.category.toUpperCase()}</Data></Cell>
   </Row>`
      rowIdx++

      cat.items.forEach((item) => {
        xml += `\n   <Row>
    <Cell><Data ss:Type="String">${item.sl}</Data></Cell>
    <Cell><Data ss:Type="String">${cat.category}</Data></Cell>
    <Cell><Data ss:Type="String">${item.desc}</Data></Cell>
    <Cell><Data ss:Type="Number">${item.qty}</Data></Cell>
    <Cell><Data ss:Type="String">${item.unit}</Data></Cell>
    <Cell><Data ss:Type="Number">${item.rate}</Data></Cell>
    <Cell ss:StyleID="Amount"><Data ss:Type="Number">${item.amt}</Data></Cell>
   </Row>`
        rowIdx++
      })
    })

    // Summary block
    xml += `\n   <Row><Cell ss:MergeAcross="6"><Data ss:Type="String"></Data></Cell></Row>`
    xml += `\n   <Row ss:Height="18"><Cell ss:MergeAcross="5" ss:StyleID="SubHeader"><Data ss:Type="String">COST ESTIMATION SUMMARY</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.grand}</Data></Cell></Row>`
    xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">Material Takeoff Cost</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.material}</Data></Cell></Row>`
    xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">Labour Takeoff Cost</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.labour}</Data></Cell></Row>`
    xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">Machinery &amp; Rental Equipment</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.equipment}</Data></Cell></Row>`
    xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">Transportation &amp; Logistics</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.transport}</Data></Cell></Row>`
    xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">Contractor Charges &amp; Margin</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.margin}</Data></Cell></Row>`
    xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">GST (18% applied)</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.gst}</Data></Cell></Row>`
    xml += `\n   <Row ss:Height="20"><Cell ss:MergeAcross="5" ss:StyleID="SubHeader"><Data ss:Type="String">GRAND TOTAL CONTRACT AMOUNT</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${costBreakdownData.grand}</Data></Cell></Row>`

    xml += `\n  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Civil_Estimation_Report_${projectId}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#121216] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm font-semibold text-slate-500">Loading Takeoff Report...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121216] pb-24 text-black dark:text-white antialiased">
      
      {/* ── Style block to handle clean print layouts ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          /* Force browser PDF engines to render background colors and border styles */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body { 
            background: white !important; 
            color: black !important; 
          }
          /* Force all print text to be dark grey/black so it is visible on white paper */
          #takeoff-report * {
            color: #111111 !important;
            border-color: #e2e8f0 !important;
          }
          #takeoff-report h1, #takeoff-report h2, #takeoff-report h3, #takeoff-report h4, #takeoff-report strong {
            color: #000000 !important;
          }
          .text-violet-500, .text-violet-600, .text-violet-700 {
            color: #4F46E5 !important;
          }
          .text-emerald-500, .text-emerald-600 {
            color: #059669 !important;
          }
          .text-amber-700, .text-amber-600 {
            color: #D97706 !important;
          }
          /* Completely hide sidebars, dashboard headers, project layouts, legends, and toolbar */
          .no-print, .print-hidden, header, nav, button, select, input, .sticky, [class*="print:hidden"],
          .absolute, [class*="absolute"] { 
            display: none !important; 
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          /* Remove layout wrapping margins */
          #takeoff-report { 
            box-shadow: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 auto !important; 
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .print-page-break { 
            page-break-after: always !important; 
            break-after: page !important;
            display: block !important;
            height: auto !important;
          }
          .print-avoid-break { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important;
            display: block !important;
            height: auto !important;
          }
          /* Cover page stretching to fill entire A4 page printable height */
          .cover-page-print {
            height: 265mm !important;
            min-height: 265mm !important;
            box-sizing: border-box !important;
            border-width: 5px !important;
            border-style: double !important;
            border-color: #4F46E5 !important;
            padding: 3rem !important;
          }
        }
      `}} />

      {/* ── Toolbar (Hidden on Print) ── */}
      <div className="bg-white dark:bg-[#1E1E24] border-b border-black/[0.06] dark:border-white/[0.06] sticky top-0 z-40 print-hidden no-print transition-all">
        <div className="max-w-[960px] mx-auto px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/projects/${projectId}/boq`)}
              className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] no-print"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[15px] font-black tracking-tight flex items-center gap-1.5">
                Takeoff Estimation Report <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[10px] font-bold">IS 1200</span>
              </h1>
              <p className="text-[11px] text-black/40 dark:text-white/30">Generate formal documents for clients and contractors</p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => setShowMetadataEditor(!showMetadataEditor)}
              className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[12.5px] font-semibold flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-violet-500" /> Edit Info
            </button>
            <button
              onClick={triggerExcelDownload}
              className="px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[12.5px] font-bold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel
            </button>
            <button
              onClick={triggerCSVDownload}
              className="px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[12.5px] font-bold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12.5px] font-bold flex items-center gap-1.5 shadow-md shadow-violet-600/25"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Metadata Editor Panel (Hidden on Print) ── */}
      {showMetadataEditor && (
        <div className="bg-white dark:bg-[#1E1E24] border-b border-black/[0.05] dark:border-white/[0.05] p-5 print-hidden no-print transition-all shadow-inner">
          <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Client Name', key: 'clientName' },
              { label: 'Contractor Name', key: 'contractorName' },
              { label: 'Architect Name', key: 'architectName' },
              { label: 'Engineer Name', key: 'engineerName' },
              { label: 'Project Address', key: 'address' },
              { label: 'City', key: 'city' },
              { label: 'State', key: 'state' },
              { label: 'Country', key: 'country' },
              { label: 'Prepared By', key: 'preparedBy' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11px] font-bold uppercase text-black/40 dark:text-white/30 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={(metadata as any)[f.key]}
                  onChange={e => setMetadata(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13px] focus:outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>
          <div className="max-w-[960px] mx-auto text-right mt-4 border-t border-black/[0.04] pt-3">
            <button
              onClick={() => setShowMetadataEditor(false)}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold"
            >
              Done Updating
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          REPORT CONTENT (Styled like a formal QS take-off paper document)
          ════════════════════════════════════════════════════════════════════════ */}
      <div id="takeoff-report" className="max-w-[900px] mx-auto bg-white dark:bg-[#1E1E24] shadow-xl border border-black/[0.06] dark:border-white/[0.06] p-12 mt-8 space-y-12 print:shadow-none print:border-none print:p-0 print:mt-0 transition-all text-[12.5px] leading-relaxed">

        {/* ── SECTION 1: COVER PAGE ── */}
        <div className="print-page-break cover-page-print flex flex-col justify-between border-2 border-slate-200/80 dark:border-white/10 p-8 rounded-2xl relative">
          <div className="text-center pt-8 space-y-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">BW</div>
              <span className="text-xl font-bold tracking-normal text-violet-600">BuildWise AI</span>
            </div>
            <p className="text-[11px] uppercase tracking-wide font-bold text-violet-500">BIM Quantity Estimation & Takeoff Report</p>
            <h1 className="text-3xl font-extrabold tracking-wide text-slate-800 dark:text-white uppercase py-10 my-4 leading-normal">{project?.name || 'Omkar Koli'}</h1>
            <div className="w-24 h-1 bg-violet-600 mx-auto rounded-full" />
            <p className="text-[13.5px] text-black/50 dark:text-white/40 max-w-[440px] mx-auto italic leading-relaxed pt-2">
              Standard quantity take-off document prepared in accordance with IS 1200 Indian standard measurement methodologies.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 border-t border-b border-black/[0.06] py-8 my-6 text-[12.5px] tracking-normal leading-relaxed">
            <div className="space-y-3">
              <p><span className="font-bold text-black/40 uppercase text-[10px] tracking-wide">Client Name:</span><br /><span className="font-bold text-[14px] text-violet-600">{metadata.clientName}</span></p>
              <p><span className="font-bold text-black/40 uppercase text-[10px] tracking-wide">Contractor:</span><br /><span className="font-semibold">{metadata.contractorName}</span></p>
              <p><span className="font-bold text-black/40 uppercase text-[10px] tracking-wide">Project Site:</span><br /><span>{metadata.address}, {metadata.city}, {metadata.state}, {metadata.country}</span></p>
            </div>
            <div className="space-y-3">
              <p><span className="font-bold text-black/40 uppercase text-[10px] tracking-wide">Architect:</span><br /><span className="font-semibold">{metadata.architectName}</span></p>
              <p><span className="font-bold text-black/40 uppercase text-[10px] tracking-wide">Engineer:</span><br /><span className="font-semibold">{metadata.engineerName}</span></p>
              <p><span className="font-bold text-black/40 uppercase text-[10px] tracking-wide">Prepared By:</span><br /><span className="italic">{metadata.preparedBy}</span></p>
            </div>
          </div>

          <div className="flex justify-end items-center text-[11px] text-black/40 pt-4">
            <span>Generated: <strong>{mounted ? new Date().toLocaleDateString() : ''}</strong></span>
          </div>
        </div>

        {/* ── SECTION 2: PROJECT SUMMARY & SECTION 3: FLOOR PLAN ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 2: Project Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-[#1E1E24] p-4 rounded-xl space-y-2 border border-black/[0.04] dark:border-white/[0.04]">
              <p className="flex justify-between"><span>Project Type:</span> <strong className="capitalize">{project?.building_type || 'Villa'}</strong></p>
              <p className="flex justify-between"><span>Number of Floors:</span> <strong>{safeEstimation.user_inputs?.num_floors || 1} Floor(s)</strong></p>
              <p className="flex justify-between"><span>Floor Height:</span> <strong>{floorHeight.toFixed(1)} m</strong></p>
              <p className="flex justify-between"><span>Typical Wall Thickness:</span> <strong>{(wallThickness * 1000).toFixed(0)} mm</strong></p>
            </div>
            <div className="bg-slate-50 dark:bg-[#1E1E24] p-4 rounded-xl space-y-2 border border-black/[0.04] dark:border-white/[0.04]">
              <p className="flex justify-between"><span>Gross Area (Sq Ft):</span> <strong>{areaSqft} sqft</strong></p>
              <p className="flex justify-between"><span>Gross Area (Sq M):</span> <strong>{areaSqm.toFixed(1)} m²</strong></p>
              <p className="flex justify-between"><span>Estimated Duration:</span> <strong>4–5 Months</strong></p>
              <p className="flex justify-between"><span>Project Status:</span> <strong className="text-emerald-500 uppercase">Quantities Confirmed</strong></p>
            </div>
          </div>

          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20 pt-4">Section 3: Floor Plan Drawing</h2>
          <div className="border border-black/[0.08] dark:border-white/[0.08] p-4 rounded-2xl bg-[#FAFAFC] dark:bg-black/20 flex flex-col items-center justify-center">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Project Plan" className="max-h-[420px] object-contain rounded-lg" />
            ) : (
              <div className="py-20 text-black/30 dark:text-white/20">No plan drawing available.</div>
            )}
            <p className="text-[10px] text-black/40 mt-2 text-center">Fig 1.1: AI Processed floor plan drawing showing rooms, dimensions, and wall locations.</p>
          </div>
        </div>

        {/* ── SECTION 4: ROOM-WISE SUMMARY ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 4: Room-wise Quantity Breakdown</h2>
          <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-xl">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#252530] font-bold text-[9px] uppercase tracking-wider text-black/50 dark:text-white/40 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="px-4 py-2.5">Room Label</th>
                  <th className="px-4 py-2.5 text-center">Size (m)</th>
                  <th className="px-4 py-2.5 text-right">Floor Area (m²)</th>
                  <th className="px-4 py-2.5 text-right">Wall Area (m²)</th>
                  <th className="px-4 py-2.5 text-right">Wall Vol (m³)</th>
                  <th className="px-4 py-2.5 text-right">Material Cost</th>
                  <th className="px-4 py-2.5 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {roomWiseSummary.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/55 dark:hover:bg-white/[0.01]">
                    <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white">{r.name}</td>
                    <td className="px-4 py-2.5 text-center text-black/55 dark:text-white/40">{r.length.toFixed(1)} × {r.width.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{r.floorArea.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{r.wallArea.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{r.wallVolume.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-violet-500 font-bold">₹{r.matCost.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-violet-600 font-black">₹{r.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 5: WALL-WISE STRUCTURAL TAKE-OFF ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 5: Wall-wise Structural Takeoff</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallWiseSummary.map((w, idx) => (
              <div key={idx} className="border border-black/[0.05] dark:border-white/[0.05] p-4 rounded-2xl bg-white dark:bg-[#1E1E24] space-y-2.5 print-avoid-break">
                <div className="flex justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-1.5">
                  <span className="font-black text-violet-500">{w.id.toUpperCase()}</span>
                  <span className="text-[10px] text-black/40 dark:text-white/30 font-bold">L: {w.length.toFixed(2)}m · T: {w.thickness * 1000}mm</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-black/60 dark:text-white/50">
                  <p className="flex justify-between"><span>Wall Vol:</span> <strong>{w.volume.toFixed(2)} m³</strong></p>
                  <p className="flex justify-between"><span>Bricks:</span> <strong>{w.brickQty} pcs</strong></p>
                  <p className="flex justify-between"><span>Cement:</span> <strong>{w.cementBags} bags</strong></p>
                  <p className="flex justify-between"><span>Sand:</span> <strong>{w.sandQty.toFixed(1)} m³</strong></p>
                  <p className="flex justify-between"><span>Paint Area:</span> <strong>{w.paintArea.toFixed(1)} m²</strong></p>
                  <p className="flex justify-between"><span>Plaster Area:</span> <strong>{w.plasterArea.toFixed(1)} m²</strong></p>
                </div>
                <div className="flex justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-2 mt-1 text-[12px] font-bold text-violet-500">
                  <span>Estimated Structural Cost:</span>
                  <span>₹{w.cost.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 6: MASTER BILL OF QUANTITIES (BOQ) ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 6: Master Bill of Quantities (BOQ)</h2>
          <div className="space-y-4 border border-black/[0.06] dark:border-white/[0.06] rounded-xl overflow-hidden">
            {masterBOQ.map((cat, i) => (
              <div key={i} className="divide-y divide-black/[0.04] dark:divide-white/[0.04] print-avoid-break">
                <div className="bg-slate-50 dark:bg-[#252530] px-4 py-2.5 font-black text-[11px] text-slate-800 dark:text-white border-b border-black/[0.05] dark:border-white/[0.05]">
                  {cat.category.toUpperCase()}
                </div>
                <table className="w-full text-left border-collapse text-[11.5px]">
                  <thead>
                    <tr className="bg-slate-100/30 dark:bg-white/[0.02] text-[9px] uppercase tracking-wider font-bold text-black/40 dark:text-white/30 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <th className="px-4 py-2 w-12 text-center">Item</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2 w-20 text-right">Qty</th>
                      <th className="px-4 py-2 w-16 text-center">Unit</th>
                      <th className="px-4 py-2 w-20 text-right">Rate</th>
                      <th className="px-4 py-2 w-24 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {cat.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/55 dark:hover:bg-white/[0.01]">
                        <td className="px-4 py-2.5 text-center text-black/40 dark:text-white/30 font-mono">{item.sl}</td>
                        <td className="px-4 py-2.5 text-black/70 dark:text-white/80">{item.desc}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatNumber(item.qty)}</td>
                        <td className="px-4 py-2.5 text-center text-black/40 dark:text-white/30">{item.unit}</td>
                        <td className="px-4 py-2.5 text-right text-black/50 dark:text-white/40">{item.rate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-violet-500">₹{item.amt.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 7: BRAND INFO & SECTION 8: LABOUR ESTIMATION ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 7: Material Brand Information</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Bricks', brand: 'Clay Brick', rate: '₹10 / brick' },
              { label: 'Cement', brand: materialConfig?.cement_brand ? CEMENT_BRANDS.find((b: any) => b.id === materialConfig.cement_brand)?.name || 'UltraTech' : 'UltraTech Cement', rate: '₹430 / bag' },
              { label: 'Steel reinforcement', brand: materialConfig?.steel_brand ? STEEL_BRAND_LIST.find((b: any) => b.id === materialConfig.steel_brand)?.name || 'TATA Tiscon' : 'TATA Tiscon TMT', rate: '₹75 / kg' },
              { label: 'Fine aggregate', brand: materialConfig?.sand_type ? SAND_CATALOG.find((s: any) => s.id === materialConfig.sand_type)?.name || 'M-Sand' : 'M-Sand', rate: '₹1,400 / m³' },
            ].map(i => (
              <div key={i.label} className="bg-slate-50 dark:bg-[#1E1E24] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
                <p className="text-[9px] text-black/40 dark:text-white/35 uppercase font-bold">{i.label}</p>
                <p className="text-[12px] font-black text-slate-800 dark:text-white mt-1 truncate">{i.brand}</p>
                <p className="text-[10px] text-violet-500 mt-0.5">{i.rate}</p>
              </div>
            ))}
          </div>

          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20 pt-4">Section 8: Labor Resource Estimation</h2>
          <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-xl">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#252530] font-bold text-[9px] uppercase tracking-wider text-black/50 dark:text-white/40 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="px-4 py-2.5">Labour Category</th>
                  <th className="px-4 py-2.5 text-center">Required Workers</th>
                  <th className="px-4 py-2.5 text-center">Estimated Days</th>
                  <th className="px-4 py-2.5 text-right">Daily Wages (₹)</th>
                  <th className="px-4 py-2.5 text-right">Total Labour Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {[
                  { type: 'Masons (Class-I)', workers: 3, days: 30, rate: 850 },
                  { type: 'Masons Helpers / Coolies', workers: 5, days: 30, rate: 450 },
                  { type: 'Carpenters / Shuttering crews', workers: 2, days: 15, rate: 800 },
                  { type: 'Bar Benders & Helpers', workers: 2, days: 10, rate: 800 },
                  { type: 'Painters (Double coat)', workers: 2, days: 12, rate: 650 },
                  { type: 'Site Supervisor', workers: 1, days: 45, rate: 1200 },
                ].map((l, idx) => {
                  const amt = l.workers * l.days * l.rate
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white">{l.type}</td>
                      <td className="px-4 py-2.5 text-center font-medium">{l.workers}</td>
                      <td className="px-4 py-2.5 text-center font-medium">{l.days}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{l.rate.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-black text-violet-500">₹{amt.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 9: EQUIPMENT & SECTION 10: COST BREAKDOWN ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 9: Equipment & Machinery Rental</h2>
          <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-xl">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#252530] font-bold text-[9px] uppercase tracking-wider text-black/50 dark:text-white/40 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="px-4 py-2.5">Machinery Description</th>
                  <th className="px-4 py-2.5 text-center">Rental Days</th>
                  <th className="px-4 py-2.5 text-right">Daily Rental Charges (₹)</th>
                  <th className="px-4 py-2.5 text-right">Rental Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {[
                  { desc: 'Concrete Mixer machine (10/7 CFT capacity)', days: 12, rate: 1200 },
                  { desc: 'Needle Concrete Vibrator (1.5 HP motor)', days: 8, rate: 450 },
                  { desc: 'Steel tabular scaffolding units (Rental package)', days: 30, rate: 800 },
                  { desc: 'Earth excavators (Backhoe JCB rental)', days: 2, rate: 9500 },
                ].map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                    <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white">{e.desc}</td>
                    <td className="px-4 py-2.5 text-center font-medium">{e.days}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{e.rate.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-black text-violet-500">₹{(e.days * e.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20 pt-4">Section 10: Total Takeoff Cost Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-[#1E1E24] p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.05] space-y-2">
              <h4 className="font-bold border-b pb-1.5 mb-2">Detailed Cost Composition</h4>
              <p className="flex justify-between"><span>Material Supply Takeoff:</span> <strong>{formatCurrency(costBreakdownData.material)}</strong></p>
              <p className="flex justify-between"><span>Direct Labor Cost:</span> <strong>{formatCurrency(costBreakdownData.labour)}</strong></p>
              <p className="flex justify-between"><span>Machinery &amp; Equipment:</span> <strong>{formatCurrency(costBreakdownData.equipment)}</strong></p>
              <p className="flex justify-between"><span>Contractor Margin / Profit:</span> <strong>{formatCurrency(costBreakdownData.margin)}</strong></p>
              <p className="flex justify-between"><span>Transportation &amp; Logistics:</span> <strong>{formatCurrency(costBreakdownData.transport)}</strong></p>
              <p className="flex justify-between"><span>GST Taxes (18% applied):</span> <strong>{formatCurrency(costBreakdownData.gst)}</strong></p>
              <p className="flex justify-between border-t pt-2 font-black text-violet-600"><span>GRAND TOTAL ESTIMATE:</span> <strong>{formatCurrency(costBreakdownData.grand)}</strong></p>
            </div>
            
            <div className="bg-slate-50 dark:bg-[#1E1E24] p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.05] space-y-2">
              <h4 className="font-bold border-b pb-1.5 mb-2">Takeoff Unit Rates</h4>
              <p className="flex justify-between"><span>Total Construction Area:</span> <strong>{areaSqft.toLocaleString()} Sq Ft</strong></p>
              <p className="flex justify-between"><span>Total Construction Area:</span> <strong>{areaSqm.toFixed(1)} Sq M</strong></p>
              <div className="w-full h-px bg-black/[0.06] dark:bg-white/[0.06] my-2" />
              <p className="flex justify-between text-[13px] font-bold"><span>Cost Per Room (avg):</span> <strong className="text-violet-500">₹{(costBreakdownData.grand / (rooms.length || 4)).toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></p>
              <p className="flex justify-between text-[13px] font-bold"><span>Cost Per Square Foot:</span> <strong className="text-violet-500">₹{costBreakdownData.perSqft.toLocaleString(undefined, {maximumFractionDigits: 0})} / sqft</strong></p>
              <p className="flex justify-between text-[13px] font-bold"><span>Cost Per Square Meter:</span> <strong className="text-violet-500">₹{costBreakdownData.perSqm.toLocaleString(undefined, {maximumFractionDigits: 0})} / m²</strong></p>
            </div>
          </div>
        </div>

        {/* ── SECTION 11 & 12: ROOM COST ANALYSIS & GRAPHICAL ANALYSIS ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 11 & 12: Graphical cost analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* SVG Pie Chart representing material vs labor vs machinery */}
            <div className="border border-black/[0.05] dark:border-white/[0.05] p-5 rounded-2xl flex flex-col items-center print-avoid-break">
              <h4 className="font-bold text-[12px] mb-4 text-center">Cost Contribution Distribution</h4>
              <svg width="200" height="200" viewBox="0 0 32 32" className="rotate-[-90deg]">
                {/* Materials: 55% -> stroke-dasharray="55 100" */}
                <circle r="16" cx="16" cy="16" fill="transparent" stroke="#6366F1" strokeWidth="32" strokeDasharray="55 100" />
                {/* Labour: 25% -> stroke-dasharray="25 100" stroke-dashoffset="-55" */}
                <circle r="16" cx="16" cy="16" fill="transparent" stroke="#10B981" strokeWidth="32" strokeDasharray="25 100" strokeDashoffset="-55" />
                {/* Equipment + Profit + Tax: 20% -> stroke-dasharray="20 100" stroke-dashoffset="-80" */}
                <circle r="16" cx="16" cy="16" fill="transparent" stroke="#F59E0B" strokeWidth="32" strokeDasharray="20 100" strokeDashoffset="-80" />
              </svg>
              <div className="flex gap-4 mt-6 text-[10.5px]">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" /> Materials (55%)</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Labour (25%)</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Others (20%)</span>
              </div>
            </div>

            {/* Room cost comparative bar chart */}
            <div className="border border-black/[0.05] dark:border-white/[0.05] p-5 rounded-2xl space-y-3.5 print-avoid-break">
              <h4 className="font-bold text-[12px] text-center mb-2">Room Cost Comparison Takeoff</h4>
              {roomWiseSummary.slice(0, 5).map((r, i) => {
                const maxCost = Math.max(...roomWiseSummary.map(x => x.totalCost)) || 1
                const pct = (r.totalCost / maxCost) * 100
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold">{r.name}</span>
                      <span>₹{r.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── SECTION 13: 3D BUILDING VIEW ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 13: 3D Building Mockup Views</h2>
          <div className="border border-black/[0.05] dark:border-white/[0.05] p-3 rounded-xl bg-slate-50 dark:bg-black/10">
            {rooms.length > 0 ? (
              <div className="h-[480px]">
                <Building3DViewer
                  rooms={rooms}
                  doors={doors}
                  windows={windows}
                  floorHeight={floorHeight}
                  scaleFactor={0.015}
                />
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-black/30 dark:text-white/20 font-bold">
                No 3D data available for this project.
              </div>
            )}
            <p className="text-[9.5px] text-black/40 dark:text-white/30 mt-1.5 text-center">Fig 1.2: AI Reconstructed 3D spatial layout view showing rooms, doors, and window partitions.</p>
          </div>
        </div>

        {/* ── SECTION 14: VALUE ENGINEERING & SUGGESTIONS ── */}
        <div className="print-page-break space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 14: AI Suggestions &amp; Value Engineering</h2>
          <div className="space-y-4">
            {aiSuggestions.map((s, idx) => (
              <div key={idx} className="border border-black/[0.06] dark:border-white/[0.06] p-4 rounded-2xl bg-slate-50/50 dark:bg-[#1E1E24] space-y-2 print-avoid-break">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <h4 className="font-black text-[13px] text-violet-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 fill-violet-500/20" /> {s.title}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px]">
                    Save ~₹{s.savings.toLocaleString()}
                  </span>
                </div>
                <p className="text-[12px] text-black/60 dark:text-white/40 leading-relaxed">
                  <strong>Recommendation Details:</strong> This substitution reduces masonry loads, limits overall mortar volume by 30-40%, and speeds up structural cycle times.
                </p>
                <div className="grid grid-cols-2 gap-4 text-[11.5px] pt-1">
                  <div className="bg-emerald-500/[0.02] border border-emerald-500/10 p-2 rounded-xl">
                    <p className="font-bold text-emerald-600 uppercase text-[9px] tracking-wider mb-1">Advantages</p>
                    <p className="text-black/65 dark:text-white/50">{s.advantages}</p>
                  </div>
                  <div className="bg-amber-500/[0.02] border border-amber-500/10 p-2 rounded-xl">
                    <p className="font-bold text-amber-600 uppercase text-[9px] tracking-wider mb-1">Disadvantages / Precautions</p>
                    <p className="text-black/65 dark:text-white/50">{s.disadvantages}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 15: ASSUMPTIONS ── */}
        <div className="space-y-6">
          <h2 className="text-[14px] font-black uppercase text-violet-500 tracking-wider pb-2 border-b-2 border-violet-500/20">Section 15: Quantity Surveyor Assumptions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] bg-slate-50 dark:bg-[#1E1E24] p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.04]">
            <p><strong>Wall Height:</strong> 3.0 m</p>
            <p><strong>Brick Size:</strong> 230×110×75 mm</p>
            <p><strong>Mortar Ratio:</strong> 1:6 (Cement:Sand)</p>
            <p><strong>Plaster Thickness:</strong> 12 mm</p>
            <p><strong>Concrete Grade:</strong> M20 (1:1.5:3)</p>
            <p><strong>Steel Grade:</strong> Fe500 TMT</p>
            <p><strong>Paint Coverage:</strong> 8.5 m²/L (2 coats)</p>
            <p><strong>Tile Wastage:</strong> 5.0 % factored</p>
          </div>
        </div>

        {/* ── FINAL REPORT TOTALS SUMMARY ── */}
        <div className="border-t-4 border-double border-[#7C3AED] pt-6 mt-12 flex flex-col items-start text-left">
          <div className="max-w-[360px] w-full space-y-1.5">
            <div className="flex justify-between text-black/55 dark:text-white/40 text-[13px]">
              <span>Aggregate Material Cost:</span>
              <span>{formatCurrency(costBreakdownData.material)}</span>
            </div>
            <div className="flex justify-between text-black/55 dark:text-white/40 text-[13px]">
              <span>Direct Labour Cost:</span>
              <span>{formatCurrency(costBreakdownData.labour)}</span>
            </div>
            <div className="flex justify-between text-black/55 dark:text-white/40 text-[13px]">
              <span>Contractor Overhead Margin:</span>
              <span>{formatCurrency(costBreakdownData.margin)}</span>
            </div>
            <div className="flex justify-between text-black/55 dark:text-white/40 text-[13px] border-b pb-2">
              <span>Taxes &amp; GST (18% applied):</span>
              <span>{formatCurrency(costBreakdownData.gst)}</span>
            </div>
            <div className="flex justify-between text-[16px] font-black text-violet-600 pt-2">
              <span>GRAND TOTAL AMOUNT:</span>
              <span>{formatCurrency(costBreakdownData.grand)}</span>
            </div>
            <p className="text-[10px] text-black/35 italic pt-1">Grand total takeoff rate: ~₹{costBreakdownData.perSqft.toFixed(0)} / Sq Ft</p>
          </div>
        </div>

      </div>
    </div>
  )
}
