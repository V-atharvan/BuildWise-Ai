'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Layers, HelpCircle, RefreshCw, Hammer, Coins, Ruler, Edit, Trash2 } from 'lucide-react'
import { Building3DViewer } from '@/components/three-d/Building3DViewer'
import { loadMaterialConfig } from '@/lib/construction-data'
import { safeLocalStorageSet } from '@/lib/utils'

export default function Project3DBuildingTab() {
  const { id: projectId } = useParams() as { id: string }

  const [rooms, setRooms] = useState<any[]>([])
  const [doors, setDoors] = useState<any[]>([])
  const [windows, setWindows] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedWall, setSelectedWall] = useState<{ roomId: string; wallIndex: number; length: number; thickness: number } | null>(null)
  const [floorHeight, setFloorHeight] = useState(3.0)
  const [wallThickness, setWallThickness] = useState(0.23)
  const [isLoading, setIsLoading] = useState(false)
  const [materialConfig, setMaterialConfig] = useState<any>(null)
  const [estimation, setEstimation] = useState<any>(null)

  // Load plan, material config, and latest estimation
  useEffect(() => {
    if (!projectId) return

    setIsLoading(true)
    const config = loadMaterialConfig(projectId)
    setMaterialConfig(config)

    // Load latest estimation run
    try {
      const keys = Object.keys(localStorage)
      const estKey = keys.find(k => 
        k.startsWith('bw_demo_est_') && 
        JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId
      )
      if (estKey) {
        setEstimation(JSON.parse(localStorage.getItem(estKey) || '{}'))
      }
    } catch (e) {
      console.error(e)
    }

    const loadPlan = async () => {
      const { getPlanRecord } = await import('@/lib/floor-plan-ai/image-cache')

      let planData = await getPlanRecord(projectId)
      if (!planData) {
        const allPlans = Object.keys(localStorage)
          .filter(k => k.startsWith('bw_demo_plan_'))
          .map(k => {
            try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} }
          })

        planData = allPlans.find(p => (p.project_id === projectId || p.id === projectId) && (p.detected_data?.rooms?.length > 0 || p.rooms?.length > 0))
          || allPlans.find(p => p.project_id === projectId || p.id === projectId)
          || allPlans.find(p => p.detected_data?.rooms?.length > 0 || p.rooms?.length > 0)
      }

      const roomsData = planData?.detected_data?.rooms || planData?.rooms
      const doorsData = planData?.detected_data?.doors || planData?.doors || []
      const windowsData = planData?.detected_data?.windows || planData?.windows || []
      const columnsData = planData?.detected_data?.columns || planData?.columns || []
      const floorH = planData?.detected_data?.floor_height_m || planData?.floor_height_m || 3.0
      const wallT = planData?.detected_data?.wall_thickness_m || planData?.wall_thickness_m || 0.23

      if (roomsData && roomsData.length > 0) {
        setRooms(roomsData)
        setDoors(doorsData)
        setWindows(windowsData)
        setColumns(columnsData)
        setFloorHeight(floorH)
        setWallThickness(wallT)
        setSelectedRoomId(roomsData[0].id)
      } else {
        const demoRooms = [
          {
            id: 'r_bed1', label: 'Bed Room (Top Left)', area_m2: 12.2, area_sqft: 132, perimeter_m: 14.0, length_m: 3.6, width_m: 3.4,
            polygon: [[100, 100], [420, 100], [420, 420], [100, 420]], centroid: [260, 260], bounding_box: [100, 100, 320, 320], aspect_ratio: 1.05,
          },
          {
            id: 'r_pooja', label: 'Pooja Room', area_m2: 8.4, area_sqft: 90, perimeter_m: 11.6, length_m: 3.0, width_m: 2.8,
            polygon: [[420, 100], [700, 100], [700, 420], [420, 420]], centroid: [560, 260], bounding_box: [420, 100, 280, 320], aspect_ratio: 1.07,
          },
          {
            id: 'r_bed2', label: 'Bed Room (Top Right)', area_m2: 12.2, area_sqft: 132, perimeter_m: 14.0, length_m: 3.6, width_m: 3.4,
            polygon: [[700, 100], [1000, 100], [1000, 420], [700, 420]], centroid: [850, 260], bounding_box: [700, 100, 300, 320], aspect_ratio: 1.05,
          },
          {
            id: 'r_lobby', label: 'Lobby / Dining', area_m2: 20.2, area_sqft: 217, perimeter_m: 19.0, length_m: 6.3, width_m: 3.2,
            polygon: [[100, 420], [700, 420], [700, 720], [100, 720]], centroid: [400, 570], bounding_box: [100, 420, 600, 300], aspect_ratio: 1.96,
          },
          {
            id: 'r_bath1', label: 'Toilet / Bath 1', area_m2: 3.4, area_sqft: 36, perimeter_m: 7.4, length_m: 2.1, width_m: 1.6,
            polygon: [[700, 420], [850, 420], [850, 720], [700, 720]], centroid: [775, 570], bounding_box: [700, 420, 150, 300], aspect_ratio: 1.3,
          },
          {
            id: 'r_bath2', label: 'Toilet / Bath 2', area_m2: 3.4, area_sqft: 36, perimeter_m: 7.4, length_m: 2.1, width_m: 1.6,
            polygon: [[850, 420], [1000, 420], [1000, 720], [850, 720]], centroid: [925, 570], bounding_box: [850, 420, 150, 300], aspect_ratio: 1.3,
          },
          {
            id: 'r_kitchen', label: 'Kitchen', area_m2: 10.9, area_sqft: 117, perimeter_m: 13.2, length_m: 3.4, width_m: 3.2,
            polygon: [[100, 720], [420, 720], [420, 1000], [100, 1000]], centroid: [260, 860], bounding_box: [100, 720, 320, 280], aspect_ratio: 1.06,
          },
          {
            id: 'r_living', label: 'Living Area', area_m2: 10.2, area_sqft: 110, perimeter_m: 12.8, length_m: 3.4, width_m: 3.0,
            polygon: [[420, 720], [700, 720], [700, 1000], [420, 1000]], centroid: [560, 860], bounding_box: [420, 720, 280, 280], aspect_ratio: 1.13,
          },
          {
            id: 'r_bed3', label: 'Bed Room (Bottom Right)', area_m2: 12.2, area_sqft: 132, perimeter_m: 14.0, length_m: 3.6, width_m: 3.4,
            polygon: [[700, 720], [1000, 720], [1000, 1000], [700, 1000]], centroid: [850, 860], bounding_box: [700, 720, 300, 280], aspect_ratio: 1.05,
          }
        ]
        setRooms(demoRooms)
        setSelectedRoomId('r_bed1')
      }
      setIsLoading(false)
    }

    loadPlan()
  }, [projectId])

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null

  // Save changes to localStorage
  const saveRoomsToLocalStorage = (updatedRooms: any[]) => {
    const planKey = Object.keys(localStorage).find(k => k.startsWith('bw_demo_plan_') && (JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId || JSON.parse(localStorage.getItem(k) || '{}').id === projectId))
    if (planKey) {
      const plan = JSON.parse(localStorage.getItem(planKey) || '{}')
      if (plan.detected_data) {
        plan.detected_data.rooms = updatedRooms
        plan.detected_data.floor_height_m = floorHeight
        plan.detected_data.wall_thickness_m = wallThickness
        safeLocalStorageSet(planKey, JSON.stringify(plan))
      }
    }
  }

  // Edit Handlers
  const handleRenameRoom = (newName: string) => {
    if (!selectedRoomId) return
    const updated = rooms.map(r => r.id === selectedRoomId ? { ...r, label: newName } : r)
    setRooms(updated)
    saveRoomsToLocalStorage(updated)
  }

  const handleResizeRoom = (newArea: number) => {
    if (!selectedRoom || !selectedRoomId) return
    const ratio = Math.sqrt(newArea / selectedRoom.area_m2)
    const updated = rooms.map(r => {
      if (r.id === selectedRoomId) {
        return {
          ...r,
          area_m2: newArea,
          area_sqft: newArea * 10.7639,
          length_m: (r.length_m || 3.0) * ratio,
          width_m: (r.width_m || 3.0) * ratio,
          perimeter_m: (r.perimeter_m || 12.0) * ratio,
          polygon: r.polygon.map(([x, y]: number[]) => {
            const dx = x - r.centroid[0]
            const dy = y - r.centroid[1]
            return [r.centroid[0] + dx * ratio, r.centroid[1] + dy * ratio]
          })
        }
      }
      return r
    })
    setRooms(updated)
    saveRoomsToLocalStorage(updated)
  }

  const handleGlobalWallThicknessChange = (val: number) => {
    setWallThickness(val)
    const planKey = Object.keys(localStorage).find(k => k.startsWith('bw_demo_plan_') && (JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId || JSON.parse(localStorage.getItem(k) || '{}').id === projectId))
    if (planKey) {
      const plan = JSON.parse(localStorage.getItem(planKey) || '{}')
      if (plan.detected_data) {
        plan.detected_data.wall_thickness_m = val
        safeLocalStorageSet(planKey, JSON.stringify(plan))
      }
    }
  }

  // Room Calculations derived from estimation-engine
  const roomCalculations = (() => {
    if (!selectedRoom) return null

    const roomTakeoff = estimation?.room_takeoffs?.find((r: any) => r.room_id === selectedRoomId)

    const area = selectedRoom.area_m2
    const perimeter = selectedRoom.perimeter_m || (Math.sqrt(area) * 4)
    const wallArea = perimeter * floorHeight
    const wallVolume = wallArea * wallThickness

    const brickCount = roomTakeoff?.bricks_count ?? Math.round(wallVolume * 500)
    const plasterArea = roomTakeoff?.plaster_m2 ?? (wallArea * 2)
    const cementBags = roomTakeoff?.cement_bags ?? Math.round(wallVolume * 0.30 * 2.5)
    const sandVol = roomTakeoff?.sand_volume_m3 ?? (wallVolume * 0.22)

    const rateBrick = estimation?.user_inputs?.rate_brick ?? 10
    const rateCement = estimation?.user_inputs?.rate_cement ?? 430
    const rateSand = estimation?.user_inputs?.rate_sand ?? 1400
    const rateTiles = estimation?.user_inputs?.rate_tiles ?? 650
    const ratePlaster = estimation?.user_inputs?.rate_plaster ?? 280
    const ratePaint = estimation?.user_inputs?.rate_paint ?? 120

    const brickCost = brickCount * rateBrick
    const cementCost = cementBags * rateCement
    const sandCost = sandVol * rateSand
    const tileCost = area * rateTiles
    const plasterCost = plasterArea * ratePlaster
    const paintCost = (wallArea * 1.20) * ratePaint

    const totalMaterialCost = brickCost + cementCost + sandCost + tileCost + plasterCost + paintCost
    const gstCost = totalMaterialCost * 0.18
    const contractorCost = totalMaterialCost * 0.10
    const grandTotal = totalMaterialCost + gstCost + contractorCost

    return {
      brickCount,
      plasterArea,
      cementBags,
      sandVol,
      brickCost,
      cementCost,
      sandCost,
      tileCost,
      plasterCost,
      paintCost,
      subtotal: totalMaterialCost,
      gstCost,
      contractorCost,
      grandTotal: roomTakeoff?.total_cost ?? grandTotal
    }
  })()

  // Selected Wall Calculations derived from estimation-engine
  const wallCalculations = (() => {
    if (!selectedWall) return null
    const len = selectedWall.length
    const thick = selectedWall.thickness
    const area = len * floorHeight
    const vol = area * thick

    const rateBrick = estimation?.user_inputs?.rate_brick ?? 10
    const rateCement = estimation?.user_inputs?.rate_cement ?? 430
    const rateSand = estimation?.user_inputs?.rate_sand ?? 1400
    const ratePlaster = estimation?.user_inputs?.rate_plaster ?? 280

    const isAAC = estimation?.user_inputs?.brick_type === 'aac_block'
    const blockVg = 0.603 * 0.203 * 0.203
    const bricks = isAAC ? Math.ceil(vol / blockVg) : Math.round(vol * 500)
    const cementBags = isAAC ? 0 : Math.round(vol * 0.22 * 1.33 / 0.0347)
    const sandVol = isAAC ? 0 : vol * 0.22 * 1.33

    const brickCost = bricks * rateBrick
    const cementCost = cementBags * rateCement
    const sandCost = sandVol * rateSand
    const plasterCost = area * 2 * ratePlaster

    const segmentCost = brickCost + cementCost + sandCost + plasterCost

    return {
      area,
      volume: vol,
      bricks,
      cementBags,
      sandVol,
      brickCost,
      cementCost,
      sandCost,
      plasterCost,
      totalCost: segmentCost
    }
  })()

  const selectedWallKey = selectedWall ? `${selectedWall.roomId}-${selectedWall.wallIndex}` : null

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mb-3" />
        <p className="text-sm font-semibold">Generating 3D spatial models...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 3D Viewport */}
        <div className="xl:col-span-3">
          <Building3DViewer
            rooms={rooms}
            doors={doors}
            windows={windows}
            columns={columns}
            floorHeight={floorHeight}
            scaleFactor={0.015}
            selectedRoomId={selectedRoomId}
            selectedWallKey={selectedWallKey}
            onRoomClick={(id) => { setSelectedRoomId(id); setSelectedWall(null) }}
            onWallClick={(wall) => { setSelectedWall(wall); setSelectedRoomId(wall.roomId) }}
          />
        </div>

        {/* Right side BIM Property Panel */}
        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            {/* Show Wall Properties first if a wall is selected */}
            {selectedWall && wallCalculations ? (
              <motion.div
                key="wall-properties"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] overflow-hidden shadow-sm flex flex-col h-full"
              >
                {/* Header */}
                <div className="p-5 border-b border-black/[0.05] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-violet-500 tracking-wider">BIM Element</span>
                    <h3 className="text-lg font-black tracking-tight mt-0.5">Wall Segment</h3>
                  </div>
                  <button onClick={() => setSelectedWall(null)} className="text-xs text-violet-500 font-bold hover:underline">
                    Room View
                  </button>
                </div>

                {/* Body scroll area */}
                <div className="p-5 space-y-5 overflow-y-auto no-scrollbar flex-1">
                  {/* Geometry */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-black/45 dark:text-white/35 uppercase tracking-widest flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" /> Wall Geometry
                    </h4>
                    <div className="space-y-2 text-[12.5px]">
                      <div className="flex justify-between items-center">
                        <span className="text-black/60 dark:text-white/50">Length</span>
                        <span className="font-bold">{selectedWall.length.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-black/60 dark:text-white/50">Height</span>
                        <span className="font-bold">{floorHeight.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-black/60 dark:text-white/50">Thickness</span>
                        <span className="font-bold">{(selectedWall.thickness * 1000).toFixed(0)} mm</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-black/[0.04] pt-2">
                        <span className="text-black/60 dark:text-white/50">Wall Area (A)</span>
                        <span className="font-bold text-violet-500">{wallCalculations.area.toFixed(2)} m²</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-black/60 dark:text-white/50">Wall Volume (V)</span>
                        <span className="font-bold text-violet-500">{wallCalculations.volume.toFixed(2)} m³</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-2.5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <h4 className="text-[11px] font-bold text-black/45 dark:text-white/35 uppercase tracking-widest flex items-center gap-1.5">
                      <Hammer className="w-3.5 h-3.5" /> Detailed Material Takeoff
                    </h4>
                    <div className="space-y-3 bg-black/[0.01] dark:bg-white/[0.01] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.04] text-[12px]">
                      <div>
                        <p className="text-[10px] text-black/40 dark:text-white/35 uppercase font-bold">Brickwork (Formula: V * 500)</p>
                        <p className="font-bold text-black/80 dark:text-white/80 mt-0.5">{wallCalculations.bricks} standard bricks</p>
                        <p className="text-[10.5px] text-black/45 dark:text-white/30 mt-0.5">Est. Cost: ₹ {Math.round(wallCalculations.brickCost).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="border-t border-black/[0.04] pt-2">
                        <p className="text-[10px] text-black/40 dark:text-white/35 uppercase font-bold">Plastering (Formula: A * 2)</p>
                        <p className="font-bold text-black/80 dark:text-white/80 mt-0.5">{(wallCalculations.area * 2).toFixed(2)} m² (Both sides)</p>
                        <p className="text-[10.5px] text-black/45 dark:text-white/30 mt-0.5">Est. Cost: ₹ {Math.round(wallCalculations.plasterCost).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="border-t border-black/[0.04] pt-2">
                        <p className="text-[10px] text-black/40 dark:text-white/35 uppercase font-bold">Cement Mortar</p>
                        <p className="font-bold text-black/80 dark:text-white/80 mt-0.5">{wallCalculations.cementBags} cement bags (OPC 53)</p>
                      </div>
                      <div className="border-t border-dashed border-black/[0.08] dark:border-white/[0.08] pt-2 flex justify-between items-center text-[13px] font-black">
                        <span>Segment Cost</span>
                        <span className="text-emerald-500">₹ {Math.round(wallCalculations.totalCost).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : selectedRoom && roomCalculations ? (
              <motion.div
                key="room-properties"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] overflow-hidden shadow-sm flex flex-col h-full"
              >
                {/* Header */}
                <div className="p-5 border-b border-black/[0.05] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01]">
                  <span className="text-[10px] font-black uppercase text-violet-500 tracking-wider">BIM Properties</span>
                  <h3 className="text-lg font-black tracking-tight mt-0.5">{selectedRoom.label}</h3>
                </div>

                {/* Body scroll area */}
                <div className="p-5 space-y-5 overflow-y-auto no-scrollbar flex-1">
                  {/* Real-time geometry edits */}
                  <div className="space-y-3 p-3 bg-violet-600/[0.02] border border-violet-500/10 rounded-2xl">
                    <h4 className="text-[10.5px] font-bold text-violet-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5" /> Edit Room Layout
                    </h4>
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] text-black/40 dark:text-white/30 uppercase font-black mb-1">Room Label</label>
                        <input
                          type="text"
                          value={selectedRoom.label}
                          onChange={(e) => handleRenameRoom(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#18181C] text-[12.5px] focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-black/40 dark:text-white/30 uppercase font-black mb-1">Area (m²)</label>
                        <input
                          type="number"
                          value={selectedRoom.area_m2.toFixed(1)}
                          onChange={(e) => handleResizeRoom(parseFloat(e.target.value) || 5)}
                          className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#18181C] text-[12.5px] focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-black/40 dark:text-white/30 uppercase font-black mb-1">Wall Thickness (m)</label>
                        <input
                          type="range"
                          min="0.10"
                          max="0.35"
                          step="0.01"
                          value={wallThickness}
                          onChange={(e) => handleGlobalWallThicknessChange(parseFloat(e.target.value))}
                          className="w-full accent-violet-500"
                        />
                        <span className="text-[10.5px] text-black/40 dark:text-white/30 font-bold block text-right mt-1">{(wallThickness * 1000).toFixed(0)} mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Space Geometry */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-black/45 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" /> Dimensions & Area
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                        <p className="text-[10px] text-black/40 dark:text-white/30">Calculated Area</p>
                        <p className="text-[14px] font-black text-black/80 dark:text-white/80 mt-0.5">{selectedRoom.area_m2.toFixed(1)} m²</p>
                        <p className="text-[10px] text-black/30 dark:text-white/20">{(selectedRoom.area_m2 * 10.7639).toFixed(0)} sqft</p>
                      </div>
                      <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
                        <p className="text-[10px] text-black/40 dark:text-white/30">Wall Perimeter</p>
                        <p className="text-[14px] font-black text-black/80 dark:text-white/80 mt-0.5">{(selectedRoom.perimeter_m || 15).toFixed(1)} m</p>
                        <p className="text-[10px] text-black/30 dark:text-white/20">Height: {floorHeight} m</p>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Estimates */}
                  <div className="space-y-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <h4 className="text-[11px] font-bold text-black/45 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                      <Hammer className="w-3.5 h-3.5" /> Quantities
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-black/60 dark:text-white/50">Bricks Required</span>
                        <span className="font-bold">{roomCalculations.brickCount.toLocaleString()} pcs</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-black/60 dark:text-white/50">Wall Plaster Area</span>
                        <span className="font-bold">{(selectedRoom.perimeter_m * floorHeight * 2).toFixed(1)} m²</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-black/60 dark:text-white/50">Flooring Tiles</span>
                        <span className="font-bold">{selectedRoom.area_m2.toFixed(1)} m²</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="space-y-2.5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <h4 className="text-[11px] font-bold text-black/45 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" /> Cost Projection
                    </h4>
                    <div className="space-y-2 bg-black/[0.01] dark:bg-white/[0.01] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-black/50 dark:text-white/40">Masonry & Bricks</span>
                        <span className="font-semibold text-black/80 dark:text-white/80">₹ {roomCalculations.brickCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-black/50 dark:text-white/40">Plaster & Cement</span>
                        <span className="font-semibold text-black/80 dark:text-white/80">₹ {roomCalculations.plasterCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-black/50 dark:text-white/40">Tiling & Flooring</span>
                        <span className="font-semibold text-black/80 dark:text-white/80">₹ {roomCalculations.tileCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-black/50 dark:text-white/40">Interior Painting</span>
                        <span className="font-semibold text-black/80 dark:text-white/80">₹ {roomCalculations.paintCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t border-black/[0.04] dark:border-white/[0.04] my-2 pt-2 flex justify-between items-center text-[13px] font-bold">
                        <span>Subtotal</span>
                        <span className="text-violet-500">₹ {roomCalculations.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-black/40 dark:text-white/30">
                        <span>Tax (GST @18%)</span>
                        <span>₹ {Math.round(roomCalculations.gstCost).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-black/40 dark:text-white/30">
                        <span>Contractor Fee (10%)</span>
                        <span>₹ {Math.round(roomCalculations.contractorCost).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t border-dashed border-black/[0.08] dark:border-white/[0.08] mt-2 pt-2 flex justify-between items-end">
                        <div>
                          <p className="text-[9px] text-black/40 dark:text-white/30 font-black uppercase">Estimated Total</p>
                          <p className="text-md font-black text-emerald-500">₹ {Math.round(roomCalculations.grandTotal).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 text-center text-black/40 dark:text-white/30 h-full flex flex-col justify-center items-center">
                <Box className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-[13px] font-bold">No Element Selected</p>
                <p className="text-[11px] mt-1">Click on a 3D room volume or individual wall segment inside the scene to view dimensions and material estimations.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
