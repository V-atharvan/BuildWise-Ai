'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileSpreadsheet, FileDown, RefreshCw, Calculator,
  Layers, Package, Grid3X3, Hammer, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  loadMaterialConfig, getRegionalRates,
  CEMENT_BRANDS, STEEL_BRAND_LIST, STEEL_GRADE_LIST,
  BRICK_CATALOG, SAND_CATALOG, AGGREGATE_CATALOG,
  PAINT_BRAND_LIST, TILE_BRAND_LIST, TILE_TYPE_LIST,
} from '@/lib/construction-data'

// Types based on the backend schemas
interface BOQItem {
  sl_no: number
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

interface BOQSection {
  section_name: string
  items: BOQItem[]
  subtotal: number
}

interface RoomBOQ {
  room_id: string
  room_name: string
  area_m2: number
  area_sqft: number
  items: BOQItem[]
  subtotal: number
}

interface BOQData {
  project_name: string
  generated_at: string
  building_boq: {
    sections: BOQSection[]
    material_subtotal: number
    labour_cost: number
    equipment_cost: number
    contractor_margin: number
    contingency: number
    gst_amount: number
    grand_total: number
  }
  room_wise_boq: RoomBOQ[]
  summary: {
    total_rooms: number
    building_area_m2: number
    building_area_sqft: number
    grand_total: number
    currency: string
  }
}

export default function ProjectBOQTab() {
  const { id: projectId } = useParams() as { id: string }

  const [activeTab, setActiveTab] = useState<'building' | 'rooms'>('building')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'A. Earthwork': true,
    'B. RCC & Structural Works': true,
    'C. Masonry & Materials': true,
    'D. Finishing Works': true,
  })
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({})
  const [localBOQ, setLocalBOQ] = useState<BOQData | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)

  // Load BOQ data from backend or generate demo BOQ
  useEffect(() => {
    if (!projectId) return

    const fetchBOQ = async () => {
      try {
        const materialConfig = loadMaterialConfig(projectId)
        const response = await fetch(`http://localhost:8000/api/v1/boq/generate/${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(materialConfig)
        })
        if (response.ok) {
          const data = await response.json()
          setLocalBOQ(data)
          return
        }
      } catch (e) {
        console.log("Backend not running or failed, loading mock/local calculations")
      }

      // Fallback local calculation matching backend rates
      const demoEst = localStorage.getItem(`bw_demo_est_${projectId}`) || 
                      Object.keys(localStorage)
                        .filter(k => k.startsWith('bw_demo_est_'))
                        .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
                        .find(est => est.project_id === projectId)

      const planData = Object.keys(localStorage)
                        .filter(k => k.startsWith('bw_demo_plan_'))
                        .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
                        .find(p => p.project_id === projectId || p.id === projectId)

      const rooms = planData?.detected_data?.rooms || [
        { id: 'r1', label: 'Living Room', area_m2: 25, perimeter_m: 20 },
        { id: 'r2', label: 'Master Bedroom', area_m2: 18, perimeter_m: 17 },
        { id: 'r3', label: 'Kitchen', area_m2: 12, perimeter_m: 14 },
        { id: 'r4', label: 'Bathroom', area_m2: 6, perimeter_m: 10 },
      ]

      const materials = demoEst?.materials || {
        concrete_volume: 38.5,
        steel_weight: 3270,
        cement_bags: 340,
        sand_volume: 24.5,
        aggregate_volume: 32.0,
        bricks_count: 14500,
        plaster_area: 480,
        paint_area: 580,
        tiles_area: 61,
        waterproofing_area: 75,
        excavation_volume: 45.0,
      }

      const cost = demoEst?.cost_breakdown || {
        concrete_cost: 211750,
        steel_cost: 245250,
        cement_cost: 146200,
        sand_cost: 34300,
        aggregate_cost: 51200,
        brick_cost: 145000,
        plaster_cost: 134400,
        paint_cost: 69600,
        tiles_cost: 39650,
        waterproofing_cost: 28500,
        excavation_cost: 9000,
        labour_cost: 330000,
        equipment_cost: 55000,
        total_material_cost: 1074850,
        gst_amount: 279500,
        contractor_margin: 155000,
        contingency: 77000,
        grand_total: 1916350,
      }

      const config = loadMaterialConfig(projectId)
      const regRates = getRegionalRates(config.region_state, config.region_city)

      const cementBrand = CEMENT_BRANDS.find(c => c.id === config.cement_brand_id) || CEMENT_BRANDS[0]
      const cementRate = cementBrand.price_per_bag

      const steelBrand = STEEL_BRAND_LIST.find(s => s.id === config.steel_brand_id) || STEEL_BRAND_LIST[0]
      let steelRate = steelBrand.price_per_kg
      const steelGrade = STEEL_GRADE_LIST.find(g => g.id === config.steel_grade_id) || STEEL_GRADE_LIST[1]
      steelRate *= steelGrade.multiplier

      const brickBrand = BRICK_CATALOG.find(b => b.id === config.brick_brand_id) || BRICK_CATALOG[0]
      const brickRate = brickBrand.price_per_unit

      const sandType = SAND_CATALOG.find(s => s.id === config.sand_type_id) || SAND_CATALOG[0]
      const sandRate = sandType.price_per_m3

      const aggType = AGGREGATE_CATALOG.find(a => a.id === config.aggregate_type_id) || AGGREGATE_CATALOG[0]
      const aggRate = aggType.price_per_m3

      const tileType = TILE_TYPE_LIST.find(t => t.id === config.tile_type_id) || TILE_TYPE_LIST[0]
      const tileBrand = TILE_BRAND_LIST.find(b => b.id === config.tile_brand_id) || TILE_BRAND_LIST[0]
      const tileRate = tileType.base_price_per_m2 * tileBrand.multiplier

      const paintBrand = PAINT_BRAND_LIST.find(p => p.id === config.paint_brand_id) || PAINT_BRAND_LIST[0]
      const paintRate = (regRates.paint_interior_m2 || 120) * paintBrand.multiplier

      const sections = [
        {
          section_name: "A. Earthwork",
          items: [
            { sl_no: 1, description: "Excavation in ordinary soil for foundations", unit: "m³", quantity: materials.excavation_volume, rate: regRates.excavation_m3 || 200, amount: cost.excavation_cost }
          ],
          subtotal: cost.excavation_cost
        },
        {
          section_name: "B. RCC & Structural Works",
          items: [
            { sl_no: 2, description: "RCC M20 grade concrete frames", unit: "m³", quantity: materials.concrete_volume, rate: regRates.concrete_rcc_m3 || 5500, amount: cost.concrete_cost },
            { sl_no: 3, description: "Steel reinforcement Fe500 TMT bars", unit: "kg", quantity: materials.steel_weight, rate: steelRate, amount: cost.steel_cost }
          ],
          subtotal: cost.concrete_cost + cost.steel_cost
        },
        {
          section_name: "C. Masonry & Materials",
          items: [
            { sl_no: 4, description: `Masonry wall units (${brickBrand.name})`, unit: "nos", quantity: materials.bricks_count || materials.blocks_count || 0, rate: brickRate, amount: cost.brick_cost || cost.block_cost || 0 },
            { sl_no: 5, description: `Cement (${cementBrand.name})`, unit: "bags", quantity: materials.cement_bags, rate: cementRate, amount: cost.cement_cost },
            { sl_no: 6, description: `River sand / M-Sand (${sandType.name})`, unit: "m³", quantity: materials.sand_volume, rate: sandRate, amount: cost.sand_cost },
            { sl_no: 7, description: `Crushed stone aggregate 20mm (${aggType.name})`, unit: "m³", quantity: materials.aggregate_volume, rate: aggRate, amount: cost.aggregate_cost }
          ],
          subtotal: (cost.brick_cost || cost.block_cost || 0) + cost.cement_cost + cost.sand_cost + cost.aggregate_cost
        },
        {
          section_name: "D. Finishing Works",
          items: [
            { sl_no: 8, description: "Cement plaster 12mm thick CM 1:4", unit: "m²", quantity: materials.plaster_area, rate: regRates.plaster_m2 || 280, amount: cost.plaster_cost },
            { sl_no: 9, description: `Interior emulsion wall painting (${paintBrand.name})`, unit: "m²", quantity: materials.paint_area, rate: paintRate, amount: cost.paint_cost },
            { sl_no: 10, description: `Vitrified floor tiles 600×600mm (${tileBrand.name})`, unit: "m²", quantity: materials.tiles_area, rate: tileRate, amount: cost.tiles_cost },
            { sl_no: 11, description: "Liquid membrane waterproofing", unit: "m²", quantity: materials.waterproofing_area, rate: regRates.waterproofing_m2 || 380, amount: cost.waterproofing_cost }
          ],
          subtotal: cost.plaster_cost + cost.paint_cost + cost.tiles_cost + cost.waterproofing_cost
        }
      ]

      const roomWise: RoomBOQ[] = rooms.map((room: any, idx: number) => {
        const area = room.area_m2 || 15
        const perimeter = room.perimeter_m || 16
        const wallVol = perimeter * 3.0 * 0.230 * 0.9
        const bricks = Math.ceil(wallVol * 500)
        return {
          room_id: room.id || `r_${idx}`,
          room_name: room.label || `Room ${idx + 1}`,
          area_m2: area,
          area_sqft: area * 10.764,
          subtotal: Math.round(bricks * brickRate + area * tileRate),
          items: [
            { sl_no: 1, description: "Brick masonry layout walls", unit: "nos", quantity: bricks, rate: brickRate, amount: Math.round(bricks * brickRate) },
            { sl_no: 2, description: "Vitrified room floor tiling", unit: "m²", quantity: area, rate: tileRate, amount: Math.round(area * tileRate) }
          ]
        }
      })

      setLocalBOQ({
        project_name: planData?.filename ? planData.filename.split('.')[0] : "BuildWise Project",
        generated_at: new Date().toISOString(),
        building_boq: {
          sections,
          material_subtotal: cost.total_material_cost,
          labour_cost: cost.labour_cost,
          equipment_cost: cost.equipment_cost,
          contractor_margin: cost.contractor_margin,
          contingency: cost.contingency,
          gst_amount: cost.gst_amount,
          grand_total: cost.grand_total,
        },
        room_wise_boq: roomWise,
        summary: {
          total_rooms: rooms.length,
          building_area_m2: planData?.detected_data?.building_area_sq_m || 85,
          building_area_sqft: (planData?.detected_data?.building_area_sq_m || 85) * 10.764,
          grand_total: cost.grand_total,
          currency: "INR"
        }
      })
    }

    fetchBOQ()
  }, [projectId])

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }))
  }

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => ({ ...prev, [roomId]: !prev[roomId] }))
  }

  const handleDownload = async (format: string) => {
    if (!projectId || !localBOQ) return
    
    if (format === 'pdf') {
      window.open(`/report/${projectId}`, '_blank')
      return
    }

    if (format === 'excel') {
      setIsExporting('excel')
      try {
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
  <Table ss:ExpandedColumnCount="6" ss:ExpandedRowCount="${localBOQ.building_boq.sections.reduce((sum, c) => sum + c.items.length + 2, 0) + 15}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="60">
   <Column ss:Width="40"/>
   <Column ss:Width="250"/>
   <Column ss:Width="50"/>
   <Column ss:Width="60"/>
   <Column ss:Width="65"/>
   <Column ss:Width="95"/>
   
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">BuildWise AI — Construction BOQ Report</Data></Cell>
   </Row>
   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String">Project: ${localBOQ.project_name} | Date: ${new Date().toLocaleDateString()}</Data></Cell></Row>
   <Row ss:Index="4" ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Sl No</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Item Description</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Quantity</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rate (₹)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount (₹)</Data></Cell>
   </Row>`

        localBOQ.building_boq.sections.forEach((section) => {
          xml += `\n   <Row ss:Height="18">
    <Cell ss:MergeAcross="5" ss:StyleID="SubHeader"><Data ss:Type="String">${section.section_name.toUpperCase()}</Data></Cell>
   </Row>`

          section.items.forEach((item) => {
            xml += `\n   <Row>
    <Cell><Data ss:Type="String">${item.sl_no}</Data></Cell>
    <Cell><Data ss:Type="String">${item.description}</Data></Cell>
    <Cell><Data ss:Type="String">${item.unit}</Data></Cell>
    <Cell><Data ss:Type="Number">${item.quantity}</Data></Cell>
    <Cell><Data ss:Type="Number">${item.rate}</Data></Cell>
    <Cell ss:StyleID="Amount"><Data ss:Type="Number">${item.amount}</Data></Cell>
   </Row>`
          })
        })

        // Summary block
        xml += `\n   <Row><Cell ss:MergeAcross="5"><Data ss:Type="String"></Data></Cell></Row>`
        xml += `\n   <Row ss:Height="18"><Cell ss:MergeAcross="5" ss:StyleID="SubHeader"><Data ss:Type="String">BOQ SUMMARY BREAKDOWN</Data></Cell></Row>`
        xml += `\n   <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">Material Takeoff Cost</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.material_subtotal}</Data></Cell></Row>`
        xml += `\n   <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">Labour Takeoff Cost</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.labour_cost}</Data></Cell></Row>`
        xml += `\n   <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">Machinery &amp; Rental Equipment</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.equipment_cost}</Data></Cell></Row>`
        xml += `\n   <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">Overhead &amp; Contractor Margin</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.contractor_margin}</Data></Cell></Row>`
        xml += `\n   <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">Contingency Buffer</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.contingency}</Data></Cell></Row>`
        xml += `\n   <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">GST (18% applied)</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.gst_amount}</Data></Cell></Row>`
        xml += `\n   <Row ss:Height="20"><Cell ss:MergeAcross="4" ss:StyleID="SubHeader"><Data ss:Type="String">GRAND TOTAL CONTRACT AMOUNT</Data></Cell><Cell ss:StyleID="Amount"><Data ss:Type="Number">${localBOQ.building_boq.grand_total}</Data></Cell></Row>`

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
        link.setAttribute('download', `BOQ_Takeoff_${projectId}.xls`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        console.error("Local Excel export failed:", err)
      } finally {
        setIsExporting(null)
      }
    }
  }

  if (!localBOQ) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mb-3" />
        <p className="text-sm font-semibold">Generating IS 1200 Quantities...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-[#1E1E24] p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-violet-500" />
          <h3 className="text-sm font-bold">Standard Cost & Quantity Takeoff Reports</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload('pdf')}
            disabled={!!isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[12px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all bg-white dark:bg-[#1E1E24]"
          >
            {isExporting === 'pdf' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF Report
          </button>
          <button
            onClick={() => handleDownload('excel')}
            disabled={!!isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[12px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all bg-white dark:bg-[#1E1E24]"
          >
            {isExporting === 'excel' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel Sheet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-black/[0.06] dark:border-white/[0.06] gap-6 text-[13.5px] font-bold">
            <button
              onClick={() => setActiveTab('building')}
              className={`pb-3 transition-colors ${activeTab === 'building' ? 'border-b-2 border-violet-500 text-violet-500' : 'text-black/40 dark:text-white/30'}`}
            >
              Building Summary BOQ
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`pb-3 transition-colors ${activeTab === 'rooms' ? 'border-b-2 border-violet-500 text-violet-500' : 'text-black/40 dark:text-white/30'}`}
            >
              Room-Wise Materials
            </button>
          </div>

          {/* Tab: Building Summary */}
          {activeTab === 'building' && (
            <div className="space-y-4">
              {localBOQ.building_boq.sections.map((section) => {
                const isExpanded = expandedSections[section.section_name]
                return (
                  <div key={section.section_name} className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl overflow-hidden transition-all">
                    <button
                      onClick={() => toggleSection(section.section_name)}
                      className="w-full flex items-center justify-between px-5 py-4 bg-black/[0.01] dark:bg-white/[0.01] border-b border-black/[0.03] dark:border-white/[0.03]"
                    >
                      <h4 className="font-bold text-[13.5px]">{section.section_name}</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[13px] font-black text-violet-500">{formatCurrency(section.subtotal)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-black/30" /> : <ChevronDown className="w-4 h-4 text-black/30" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[12.5px]">
                          <thead>
                            <tr className="bg-black/[0.01] dark:bg-white/[0.01] text-[10px] font-bold text-black/45 dark:text-white/30 uppercase border-b border-black/[0.04] dark:border-white/[0.04]">
                              <th className="px-5 py-3 w-12 text-center">Sl.</th>
                              <th className="px-5 py-3">Description of Item</th>
                              <th className="px-5 py-3 w-16">Unit</th>
                              <th className="px-5 py-3 w-24 text-right">Qty</th>
                              <th className="px-5 py-3 w-24 text-right">Rate (₹)</th>
                              <th className="px-5 py-3 w-28 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                            {section.items.map((item) => (
                              <tr key={item.sl_no} className="hover:bg-black/[0.005] dark:hover:bg-white/[0.005]">
                                <td className="px-5 py-3 text-center text-black/40">{item.sl_no}</td>
                                <td className="px-5 py-3 font-semibold text-black/75 dark:text-white/70">{item.description}</td>
                                <td className="px-5 py-3 text-black/50">{item.unit}</td>
                                <td className="px-5 py-3 text-right font-medium">{formatNumber(item.quantity)}</td>
                                <td className="px-5 py-3 text-right text-black/50">{item.rate.toLocaleString()}</td>
                                <td className="px-5 py-3 text-right font-black text-violet-500">₹{item.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Tab: Room Wise Breakdown */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              {localBOQ.room_wise_boq.map((room) => {
                const isExpanded = expandedRooms[room.room_id]
                return (
                  <div key={room.room_id} className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl overflow-hidden transition-all">
                    <button
                      onClick={() => toggleRoom(room.room_id)}
                      className="w-full flex items-center justify-between px-5 py-4 bg-black/[0.01] dark:bg-white/[0.01] border-b border-black/[0.03] dark:border-white/[0.03]"
                    >
                      <div>
                        <h4 className="font-bold text-[13.5px] text-left">{room.room_name}</h4>
                        <p className="text-[10px] text-black/35 dark:text-white/25 mt-0.5">{room.area_sqft.toFixed(0)} sq.ft ({room.area_m2.toFixed(1)} m²)</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[13px] font-black text-violet-500">{formatCurrency(room.subtotal)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-black/30" /> : <ChevronDown className="w-4 h-4 text-black/30" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[12.5px]">
                          <thead>
                            <tr className="bg-black/[0.01] dark:bg-white/[0.01] text-[10px] font-bold text-black/45 dark:text-white/30 uppercase border-b border-black/[0.04] dark:border-white/[0.04]">
                              <th className="px-5 py-3 w-12 text-center">Sl.</th>
                              <th className="px-5 py-3">Material Category</th>
                              <th className="px-5 py-3 w-16">Unit</th>
                              <th className="px-5 py-3 w-24 text-right">Qty</th>
                              <th className="px-5 py-3 w-24 text-right">Rate (₹)</th>
                              <th className="px-5 py-3 w-28 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                            {room.items.map((item) => (
                              <tr key={item.sl_no}>
                                <td className="px-5 py-3 text-center text-black/40">{item.sl_no}</td>
                                <td className="px-5 py-3 font-semibold text-black/75 dark:text-white/70">{item.description}</td>
                                <td className="px-5 py-3 text-black/50">{item.unit}</td>
                                <td className="px-5 py-3 text-right font-medium">{formatNumber(item.quantity)}</td>
                                <td className="px-5 py-3 text-right text-black/50">{item.rate.toLocaleString()}</td>
                                <td className="px-5 py-3 text-right font-black text-violet-500">₹{item.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar Cost summary (1 col) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5 space-y-4">
            <h3 className="font-bold text-[14px] pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">BOQ Summary</h3>
            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Materials Subtotal</span>
                <span>{formatCurrency(localBOQ.building_boq.material_subtotal)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Labour Cost (approx)</span>
                <span>{formatCurrency(localBOQ.building_boq.labour_cost)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Machinery & Tools</span>
                <span>{formatCurrency(localBOQ.building_boq.equipment_cost)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Overhead & Margin</span>
                <span>{formatCurrency(localBOQ.building_boq.contractor_margin)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Contingency Buffer</span>
                <span>{formatCurrency(localBOQ.building_boq.contingency)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>GST (18% applied)</span>
                <span>{formatCurrency(localBOQ.building_boq.gst_amount)}</span>
              </div>
              <div className="flex justify-between text-[14.5px] font-black text-violet-500 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] mt-3">
                <span>Grand Total BOQ</span>
                <span>{formatCurrency(localBOQ.summary.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/[0.02] border border-violet-500/10 rounded-[24px] p-5 space-y-2">
            <p className="text-[10px] uppercase font-black text-violet-500 tracking-wider">Compliance Report</p>
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-black/70 dark:text-white/70">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>IS 1200 Methodologies</span>
            </div>
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-black/70 dark:text-white/70">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>IS 456 Concrete Grading</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
