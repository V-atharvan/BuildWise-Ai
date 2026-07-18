'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RefreshCw, ShieldAlert, DoorOpen, AppWindow } from 'lucide-react'
import { FloorPlanViewer } from '@/components/floor-plan/FloorPlanViewer'
import { RoomDashboard } from '@/components/floor-plan/RoomDashboard'
import type { AIRoom as DetectedRoom, AIWall as DetectedWall, AIDoor, AIWindow } from '@/lib/floor-plan-ai/types'

export default function ProjectFloorPlansTab() {
  const router = useRouter()
  const { id: projectId } = useParams() as { id: string }

  const [imageUrl, setImageUrl] = useState<string>('')
  const [rooms, setRooms] = useState<DetectedRoom[]>([])
  const [walls, setWalls] = useState<DetectedWall[]>([])
  const [doors, setDoors] = useState<AIDoor[]>([])
  const [windows, setWindows] = useState<AIWindow[]>([])
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
      setFloorHeight(dd.floor_height_m || 3.0)
      setWallThickness(dd.wall_thickness_m || 0.23)
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

      setRooms(demoRooms)
      setWalls(demoWalls)
      setDoors(demoDoors)
      setWindows(demoWindows)

      // Save to localStorage
      const mockPlan = {
        id: planData?.id || projectId,
        project_id: projectId,
        filename: planData?.filename || 'demo_layout.png',
        status: 'done',
        created_at: new Date().toISOString(),
        detected_data: {
          rooms: demoRooms, walls: demoWalls, doors: demoDoors, windows: demoWindows,
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
    }
    setIsLoading(false)
  }, [projectId])

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null

  const persistRooms = (updatedRooms: DetectedRoom[]) => {
    const planKey = Object.keys(localStorage).find(k =>
      k.startsWith('bw_demo_plan_') &&
      (JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId ||
       JSON.parse(localStorage.getItem(k) || '{}').id === projectId)
    )
    if (planKey) {
      const plan = JSON.parse(localStorage.getItem(planKey) || '{}')
      if (plan.detected_data) {
        plan.detected_data.rooms = updatedRooms
        localStorage.setItem(planKey, JSON.stringify(plan))
      }
    }
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
    persistRooms(updated)
  }

  const handleRoomDelete = (roomId: string) => {
    if (confirm('Remove this false detection?')) {
      const updated = rooms.filter(r => r.id !== roomId)
      setRooms(updated)
      setSelectedRoomId(null)
      persistRooms(updated)
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
      persistRooms(updated)
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

      {/* Floor Plan Viewer */}
      <FloorPlanViewer
        imageUrl={imageUrl}
        imageWidth={1000}
        imageHeight={800}
        rooms={rooms}
        walls={walls}
        doors={doors}
        windows={windows}
        selectedRoomId={selectedRoomId}
        onRoomClick={(room) => setSelectedRoomId(room.id)}
        onRoomRename={handleRoomRename}
        onRoomDelete={handleRoomDelete}
        onRoomMerge={handleRoomMerge}
      />

      {/* Room Dashboard Slide-out */}
      {selectedRoom && (
        <RoomDashboard
          room={selectedRoom as any}
          floorHeight={floorHeight}
          wallThickness={wallThickness}
          onClose={() => setSelectedRoomId(null)}
          onView3D={() => router.push(`/projects/${projectId}/3d-building`)}
        />
      )}
    </div>
  )
}
