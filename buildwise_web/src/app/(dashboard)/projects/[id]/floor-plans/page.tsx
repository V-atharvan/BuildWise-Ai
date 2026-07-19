'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RefreshCw, ShieldAlert, DoorOpen, AppWindow } from 'lucide-react'
import { FloorPlanViewer } from '@/components/floor-plan/FloorPlanViewer'
import { RoomCorrectionPanel } from '@/components/floor-plan/RoomCorrectionPanel'
import type { 
  AIRoom as DetectedRoom, AIWall as DetectedWall, AIDoor, AIWindow,
  AIColumn, AIStaircase, GeometryRelationships
} from '@/lib/floor-plan-ai/types'

export default function ProjectFloorPlansTab() {
  const router = useRouter()
  const { id: projectId } = useParams() as { id: string }

  const [imageUrl, setImageUrl] = useState<string>('')
  const [rooms, setRooms] = useState<DetectedRoom[]>([])
  const [walls, setWalls] = useState<DetectedWall[]>([])
  const [doors, setDoors] = useState<AIDoor[]>([])
  const [windows, setWindows] = useState<AIWindow[]>([])
  const [columns, setColumns] = useState<AIColumn[]>([])
  const [staircases, setStaircases] = useState<AIStaircase[]>([])
  const [relationships, setRelationships] = useState<GeometryRelationships | undefined>(undefined)
  const [drawingClassification, setDrawingClassification] = useState<any>(undefined)
  const [imageQuality, setImageQuality] = useState<any>(undefined)
  const [geometryValidation, setGeometryValidation] = useState<any>(undefined)
  const [pxPerMeter, setPxPerMeter] = useState<number>(50)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [floorHeight, setFloorHeight] = useState(3.0)
  const [wallThickness, setWallThickness] = useState(0.23)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load plan and room details
  useEffect(() => {
    if (!projectId) return
    setIsLoading(true)

    const planData = Object.keys(localStorage)
      .filter(k => k.startsWith('bw_demo_plan_'))
      .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
      .find(p => p.project_id === projectId || p.id === projectId)

    const savedImage = localStorage.getItem(`bw_demo_file_data_${planData?.id || projectId}`)
    setImageUrl(savedImage || '')

    const isDemoPlanFile = (filename?: string) => {
      if (!filename) return true
      const fn = filename.toLowerCase()
      return fn.includes('demo_layout') || fn.includes('1000-sq-ft') || fn.includes('house-plan') || fn.includes('house_plan')
    }
    const isStaticDemo = projectId?.startsWith('demo_proj_') && isDemoPlanFile(planData?.filename)
    if (planData?.detected_data?.rooms) {
      const dd = planData.detected_data
      setRooms(dd.rooms)
      setWalls(dd.walls || [])
      setDoors(dd.doors || [])
      setWindows(dd.windows || [])
      setColumns(dd.columns || [])
      setStaircases(dd.staircases || [])
      setRelationships(dd.relationships)
      setDrawingClassification(dd.drawing_classification)
      setImageQuality(dd.image_quality)
      setGeometryValidation(dd.geometry_validation)
      setFloorHeight(dd.floor_height_m || 3.0)
      setWallThickness(dd.wall_thickness_m || 0.23)
      setPxPerMeter(dd.scale?.px_per_meter || 50)
    } else if (isStaticDemo) {
      // High-fidelity demo with full confidence and classification data
      const demoRooms: DetectedRoom[] = [
        {
          id: 'r1', label: 'Living Room', room_type: 'living_room',
          area_m2: 24.8, area_sqft: 267, perimeter_m: 20, length_m: 5.5, width_m: 4.5,
          polygon: [[100,100],[466,100],[466,400],[100,400]], centroid: [283,250],
          bounding_box: [100,100,366,300], aspect_ratio: 1.22, floor_height_m: 3.0,
          adjacent_room_ids: ['r2','r3'], door_ids: ['d1'], window_ids: ['w1'],
          wall_ids: [],
          classification: {
            classified_label: 'Living Room', room_type: 'living_room',
            confidence: { overall: 0.97, ocr: { value: 0.98, source: 'OCR "LIVING ROOM"' }, geometry: { value: 0.95, source: 'Size 24.8m² matches typical living room' } },
            low_confidence_flag: false, flag_level: 'ok', needs_user_confirmation: false,
            reason: 'High confidence: OCR label "LIVING ROOM" found + geometry matches typical living room dimensions',
            all_candidates: { 'Living Room': 0.97, 'Dining Room': 0.05 }
          }
        },
        {
          id: 'r2', label: 'Master Bedroom', room_type: 'master_bedroom',
          area_m2: 18.0, area_sqft: 194, perimeter_m: 17, length_m: 4.5, width_m: 4.0,
          polygon: [[466,100],[766,100],[766,366],[466,366]], centroid: [616,233],
          bounding_box: [466,100,300,266], aspect_ratio: 1.12, floor_height_m: 3.0,
          adjacent_room_ids: ['r1'], door_ids: ['d2'], window_ids: ['w2'],
          wall_ids: [],
          classification: {
            classified_label: 'Master Bedroom', room_type: 'master_bedroom',
            confidence: { overall: 0.74, ocr: { value: 0.60, source: 'Weak OCR — partial label detected' }, geometry: { value: 0.80, source: 'Size 18m² fits master bedroom range' } },
            low_confidence_flag: true, flag_level: 'review', needs_user_confirmation: true,
            reason: 'Review suggested: OCR partially detected, geometry matches. Please confirm room type.',
            all_candidates: { 'Master Bedroom': 0.74, 'Bedroom': 0.55, 'Study': 0.20 }
          }
        },
        {
          id: 'r3', label: 'Kitchen', room_type: 'kitchen',
          area_m2: 12.0, area_sqft: 129, perimeter_m: 14, length_m: 4.0, width_m: 3.0,
          polygon: [[100,400],[366,400],[366,600],[100,600]], centroid: [233,500],
          bounding_box: [100,400,266,200], aspect_ratio: 1.33, floor_height_m: 3.0,
          adjacent_room_ids: ['r1','r4'], door_ids: [], window_ids: ['w3'],
          wall_ids: [],
          classification: {
            classified_label: 'Kitchen', room_type: 'kitchen',
            confidence: { overall: 0.95, ocr: { value: 0.93, source: 'OCR "KITCHEN"' }, geometry: { value: 0.92, source: '12m² within kitchen range 8–15m²' } },
            low_confidence_flag: false, flag_level: 'ok', needs_user_confirmation: false,
            reason: 'High confidence: OCR "KITCHEN" + fixture detection + typical kitchen proportions',
            all_candidates: { Kitchen: 0.95, Utility: 0.05 }
          }
        },
        {
          id: 'r4', label: 'Bathroom', room_type: 'bathroom',
          area_m2: 5.0, area_sqft: 54, perimeter_m: 9, length_m: 2.5, width_m: 2.0,
          polygon: [[366,400],[533,400],[533,533],[366,533]], centroid: [449,466],
          bounding_box: [366,400,167,133], aspect_ratio: 1.25, floor_height_m: 3.0,
          adjacent_room_ids: ['r3'], door_ids: ['d3'], window_ids: [],
          wall_ids: [],
          classification: {
            classified_label: 'Bathroom', room_type: 'bathroom',
            confidence: { overall: 0.58, ocr: { value: 0.0, source: 'No OCR text detected' }, geometry: { value: 0.65, source: 'Small 5m² space — could be bathroom or toilet' } },
            low_confidence_flag: true, flag_level: 'critical', needs_user_confirmation: true,
            reason: 'Critical review: No OCR label found. Inferred from toilet fixture detection + small area. Please confirm.',
            all_candidates: { Bathroom: 0.58, Toilet: 0.40, 'Store Room': 0.10 }
          }
        },
      ]
      const demoWalls: DetectedWall[] = [
        { id: 'w1', start: [100,100], end: [766,100], length_px: 666, length_m: 9.99, thickness_px: 15, thickness_m: 0.23, wall_type: 'external', room_ids: [], door_ids: [], window_ids: [], is_structural: true, confidence: 0.95 },
        { id: 'w2', start: [100,100], end: [100,600], length_px: 500, length_m: 7.5, thickness_px: 15, thickness_m: 0.23, wall_type: 'external', room_ids: [], door_ids: [], window_ids: [], is_structural: true, confidence: 0.95 },
        { id: 'w3', start: [100,400], end: [533,400], length_px: 433, length_m: 6.5, thickness_px: 10, thickness_m: 0.15, wall_type: 'internal', room_ids: [], door_ids: [], window_ids: [], is_structural: false, confidence: 0.88 },
        { id: 'w4', start: [466,100], end: [466,400], length_px: 300, length_m: 4.5, thickness_px: 10, thickness_m: 0.15, wall_type: 'internal', room_ids: [], door_ids: [], window_ids: [], is_structural: false, confidence: 0.88 },
      ]
      const demoDoors: AIDoor[] = [
        { id: 'd1', wall_id: 'w4', room_id: 'r1', adjacent_room_id: 'r2', center: [466,280], width_m: 0.9, height_m: 2.1, type: 'single', swing_direction: 'inward', swing_angle: 90, confidence: 0.92 },
        { id: 'd2', wall_id: 'w1', room_id: 'r2', adjacent_room_id: null, center: [616,100], width_m: 0.9, height_m: 2.1, type: 'single', swing_direction: 'inward', swing_angle: 90, confidence: 0.88 },
        { id: 'd3', wall_id: 'w3', room_id: 'r4', adjacent_room_id: 'r3', center: [430,400], width_m: 0.75, height_m: 2.1, type: 'single', swing_direction: 'inward', swing_angle: 90, confidence: 0.85 },
      ]
      const demoWindows: AIWindow[] = [
        { id: 'w1', wall_id: 'w1', room_id: 'r1', center: [283,100], width_m: 1.5, height_m: 1.2, sill_height_m: 0.9, confidence: 0.90 },
        { id: 'w2', wall_id: 'w1', room_id: 'r2', center: [616,100], width_m: 1.2, height_m: 1.2, sill_height_m: 0.9, confidence: 0.88 },
        { id: 'w3', wall_id: 'w2', room_id: 'r3', center: [100,500], width_m: 1.0, height_m: 1.0, sill_height_m: 1.0, confidence: 0.85 },
      ]
      const demoColumns = [
        { id: 'col_1', shape: 'square' as const, center: [100, 100] as [number, number], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.98 },
        { id: 'col_2', shape: 'square' as const, center: [466, 100] as [number, number], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.95 },
        { id: 'col_3', shape: 'square' as const, center: [766, 100] as [number, number], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.96 },
        { id: 'col_4', shape: 'square' as const, center: [100, 400] as [number, number], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.94 },
      ]
      const demoStaircases = [
        { id: 'staircase_1', stair_type: 'dog_leg' as const, start_px: [120, 300] as [number, number], end_px: [200, 380] as [number, number], direction: 'up' as const, num_flights: 2, landing_detected: true, confidence: 0.92 }
      ]
      const demoClassification = {
        drawing_type: 'architectural',
        confidence: 0.99,
        is_architectural_floor_plan: true
      }
      const demoQuality = {
        score: 85,
        problems: ['Slight Noise'],
        recommendations: ['Optimal image contrast. Ready for structural estimation.'],
        brightness: 180,
        contrast: 150,
        blur_index: 8.5,
        is_skewed: false
      }
      const demoRelationships = {
        room_wall_adjacency: { 'r1': ['w2', 'w4'], 'r2': ['w1', 'w4'], 'r3': ['w2'], 'r4': ['w3'] },
        room_connectivity_graph: { 'r1': ['r2'], 'r2': ['r1'], 'r3': ['r4'], 'r4': ['r3'] },
        door_connectivity_graph: {
          'd1': { door_id: 'd1', room_a: 'r1', room_b: 'r2' },
          'd2': { door_id: 'd2', room_a: 'r2', room_b: null },
          'd3': { door_id: 'd3', room_a: 'r4', room_b: 'r3' }
        },
        window_connectivity_graph: {
          'w1': { window_id: 'w1', room_id: 'r1' },
          'w2': { window_id: 'w2', room_id: 'r2' },
          'w3': { window_id: 'w3', room_id: 'r3' }
        },
        building_boundary: [[100,100],[766,100],[766,366],[533,366],[533,533],[366,533],[366,600],[100,600]] as [number, number][],
        wall_centerlines: [
          { wall_id: 'w1', start: [100,100] as [number, number], end: [766,100] as [number, number] },
          { wall_id: 'w2', start: [100,100] as [number, number], end: [100,600] as [number, number] },
          { wall_id: 'w3', start: [100,400] as [number, number], end: [533,400] as [number, number] },
          { wall_id: 'w4', start: [466,100] as [number, number], end: [466,400] as [number, number] }
        ]
      }

      setRooms(demoRooms)
      setWalls(demoWalls)
      setDoors(demoDoors)
      setWindows(demoWindows)
      setColumns(demoColumns)
      setStaircases(demoStaircases)
      setRelationships(demoRelationships)
      setDrawingClassification(demoClassification)
      setImageQuality(demoQuality)
      setGeometryValidation({ is_valid: true, issues: [], rooms_validated: 4, walls_validated: 4, auto_corrections_applied: 0 })
      setPxPerMeter(50)

      // Save to localStorage
      const mockPlan = {
        id: planData?.id || projectId,
        project_id: projectId,
        filename: planData?.filename || 'demo_layout.png',
        status: 'done',
        created_at: new Date().toISOString(),
        detected_data: {
          rooms: demoRooms, walls: demoWalls, doors: demoDoors, windows: demoWindows,
          columns: demoColumns, staircases: demoStaircases, relationships: demoRelationships,
          drawing_classification: demoClassification, image_quality: demoQuality,
          floor_height_m: 3.0, wall_thickness_m: 0.23, total_area_m2: 59.8, total_area_sqft: 644,
          overall_confidence: 0.81, low_confidence_room_ids: ['r2', 'r4'],
          geometry_validation: { is_valid: true, issues: [], rooms_validated: 4, walls_validated: 4, auto_corrections_applied: 0 }
        }
      }
      const key = planData?.id ? `bw_demo_plan_${planData.id}` : `bw_demo_plan_${projectId}`
      localStorage.setItem(key, JSON.stringify(mockPlan))
    } else {
      setRooms([])
      setWalls([])
      setDoors([])
      setWindows([])
      setColumns([])
      setStaircases([])
      setRelationships(undefined)
      setDrawingClassification(undefined)
      setImageQuality(undefined)
      setGeometryValidation(undefined)
    }
    setIsLoading(false)
  }, [projectId])

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null

  const persistState = (
    updatedRooms: DetectedRoom[],
    updatedWalls: DetectedWall[],
    updatedDoors: AIDoor[],
    updatedWindows: AIWindow[],
    ratio: number,
    height: number,
    thickness: number
  ) => {
    const planKey = Object.keys(localStorage).find(k =>
      k.startsWith('bw_demo_plan_') &&
      (JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId ||
       JSON.parse(localStorage.getItem(k) || '{}').id === projectId)
    )
    if (planKey) {
      const plan = JSON.parse(localStorage.getItem(planKey) || '{}')
      if (plan.detected_data) {
        plan.detected_data.rooms = updatedRooms
        plan.detected_data.walls = updatedWalls
        plan.detected_data.doors = updatedDoors
        plan.detected_data.windows = updatedWindows
        plan.detected_data.floor_height_m = height
        plan.detected_data.wall_thickness_m = thickness
        if (plan.detected_data.scale) {
          plan.detected_data.scale.px_per_meter = ratio
        } else {
          plan.detected_data.scale = {
            px_per_meter: ratio,
            detected_scale: '1:100',
            unit: 'meters',
            confidence: 0.9,
            source: 'estimated',
            scale_bar_detected: false,
            user_confirmed: true
          }
        }
        localStorage.setItem(planKey, JSON.stringify(plan))
      }
    }
  }

  const handleFloorHeightChange = (height: number) => {
    setFloorHeight(height)
    const updatedRooms = rooms.map(r => ({
      ...r,
      floor_height_m: height
    }))
    setRooms(updatedRooms)
    persistState(updatedRooms, walls, doors, windows, pxPerMeter, height, wallThickness)
  }

  const handleWallThicknessChange = (thickness: number) => {
    setWallThickness(thickness)
    const updatedWalls = walls.map(w => ({
      ...w,
      thickness_m: thickness,
      thickness_px: thickness * pxPerMeter
    }))
    setWalls(updatedWalls)
    persistState(rooms, updatedWalls, doors, windows, pxPerMeter, floorHeight, thickness)
  }

  const handlePxPerMeterChange = (ratio: number) => {
    if (ratio <= 0) return
    setPxPerMeter(ratio)
    const updatedRooms = rooms.map(r => {
      const [,, wPx, hPx] = r.bounding_box
      const length_m = wPx / ratio
      const width_m = hPx / ratio
      const area_m2 = (r.area_m2 * (pxPerMeter * pxPerMeter)) / (ratio * ratio)
      return {
        ...r,
        length_m,
        width_m,
        area_m2,
        area_sqft: area_m2 * 10.7639,
        perimeter_m: (r.perimeter_m * pxPerMeter) / ratio
      }
    })

    const updatedWalls = walls.map(w => {
      return {
        ...w,
        length_m: w.length_px / ratio,
        thickness_m: w.thickness_px / ratio
      }
    })

    const updatedDoors = doors.map(d => {
      return {
        ...d,
        width_m: (d.width_m * pxPerMeter) / ratio
      }
    })

    const updatedWindows = windows.map(win => {
      return {
        ...win,
        width_m: (win.width_m * pxPerMeter) / ratio
      }
    })

    setRooms(updatedRooms)
    setWalls(updatedWalls)
    setDoors(updatedDoors)
    setWindows(updatedWindows)
    persistState(updatedRooms, updatedWalls, updatedDoors, updatedWindows, ratio, floorHeight, wallThickness)
  }

  const handleRoomRename = (roomId: string, newLabel: string) => {
    const updated = rooms.map(r => r.id === roomId ? {
      ...r, label: newLabel,
      classification: r.classification ? {
        ...r.classification,
        classified_label: newLabel,
        confidence: { ...r.classification.confidence, overall: 1.0 },
        low_confidence_flag: false,
        reason: 'User-confirmed label'
      } : undefined
    } : r) as DetectedRoom[]
    setRooms(updated)
    persistState(updated, walls, doors, windows, pxPerMeter, floorHeight, wallThickness)
  }

  const handleRoomDelete = (roomId: string) => {
    if (confirm('Remove this false detection?')) {
      const updated = rooms.filter(r => r.id !== roomId)
      setRooms(updated)
      setSelectedRoomId(null)
      persistState(updated, walls, doors, windows, pxPerMeter, floorHeight, wallThickness)
    }
  }

  const handleRoomMerge = (roomIdA: string, roomIdB: string) => {
    const roomA = rooms.find(r => r.id === roomIdA)
    const roomB = rooms.find(r => r.id === roomIdB)
    if (!roomA || !roomB) return
    setIsProcessing(true)
    setTimeout(() => {
      const mergedRoom: DetectedRoom = {
        ...roomA,
        id: `room_merged_${Date.now().toString().slice(-6)}`,
        label: `${roomA.label} + ${roomB.label}`,
        area_m2: roomA.area_m2 + roomB.area_m2,
        area_sqft: roomA.area_sqft + roomB.area_sqft,
        perimeter_m: roomA.perimeter_m + roomB.perimeter_m - 4.0,
        length_m: Math.max(roomA.length_m, roomB.length_m),
        width_m: Math.max(roomA.width_m, roomB.width_m),
        polygon: [...roomA.polygon, ...roomB.polygon].slice(0, 8),
        centroid: [(roomA.centroid[0] + roomB.centroid[0]) / 2, (roomA.centroid[1] + roomB.centroid[1]) / 2],
        door_ids: [...roomA.door_ids, ...roomB.door_ids],
        window_ids: [...roomA.window_ids, ...roomB.window_ids],
        adjacent_room_ids: [...new Set([...roomA.adjacent_room_ids, ...roomB.adjacent_room_ids])].filter(id => id !== roomIdA && id !== roomIdB),
      }
      const updated = [...rooms.filter(r => r.id !== roomIdA && r.id !== roomIdB), mergedRoom]
      setRooms(updated)
      setSelectedRoomId(mergedRoom.id)
      persistState(updated, walls, doors, windows, pxPerMeter, floorHeight, wallThickness)
      setIsProcessing(false)
    }, 800)
  }

  const totalArea = rooms.reduce((sum, r) => sum + r.area_m2, 0)
  const lowConfidenceRooms = rooms.filter(r => (r.classification?.confidence?.overall ?? 1.0) < 0.90)

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mb-3" />
        <p className="text-sm font-semibold">Loading blueprint assets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Low confidence alert */}
      {lowConfidenceRooms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-black text-amber-600 dark:text-amber-500">AI Review Required</h4>
            <p className="text-[12px] text-black/50 dark:text-white/40 mt-0.5">
              {lowConfidenceRooms.length} room{lowConfidenceRooms.length > 1 ? 's' : ''} detected with confidence below 90%.
              Highlighted with orange borders — click to rename or confirm.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lowConfidenceRooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoomId(r.id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition-all"
                >
                  {r.label} ({Math.round((r.classification?.confidence?.overall ?? 0) * 100)}%)
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Rooms', value: rooms.length, color: 'text-violet-500' },
          { label: 'Total Area', value: `${totalArea.toFixed(1)} m²`, color: 'text-emerald-500' },
          { label: 'Doors', value: doors.length, color: 'text-gray-500', icon: DoorOpen },
          { label: 'Windows', value: windows.length, color: 'text-blue-500', icon: AppWindow },
          { label: 'Walls', value: walls.length, color: 'text-amber-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1E1E24] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-4">
            <p className="text-[11px] text-black/40 dark:text-white/30 font-medium">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <FloorPlanViewer
            imageUrl={imageUrl}
            imageWidth={1000}
            imageHeight={800}
            rooms={rooms}
            walls={walls}
            doors={doors}
            windows={windows}
            columns={columns}
            staircases={staircases}
            relationships={relationships}
            selectedRoomId={selectedRoomId}
            onRoomClick={(room) => setSelectedRoomId(room.id)}
            onRoomRename={handleRoomRename}
            onRoomDelete={handleRoomDelete}
            onRoomMerge={handleRoomMerge}
          />
        </div>
        <div className="lg:col-span-1 h-[650px]">
          <RoomCorrectionPanel
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onRoomSelect={setSelectedRoomId}
            onRename={handleRoomRename}
            onDelete={handleRoomDelete}
            onMerge={handleRoomMerge}
            isProcessing={isProcessing}
            drawingClassification={drawingClassification}
            imageQuality={imageQuality}
            geometryValidation={geometryValidation}
            floorHeight={floorHeight}
            wallThickness={wallThickness}
            pxPerMeter={pxPerMeter}
            onFloorHeightChange={handleFloorHeightChange}
            onWallThicknessChange={handleWallThicknessChange}
            onPxPerMeterChange={handlePxPerMeterChange}
          />
        </div>
      </div>
    </div>
  )
}
