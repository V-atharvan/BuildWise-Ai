'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RefreshCw, HelpCircle, ShieldAlert } from 'lucide-react'
import { FloorPlanViewer, type DetectedRoom } from '@/components/floor-plan/FloorPlanViewer'
import { RoomDashboard } from '@/components/floor-plan/RoomDashboard'
import { RoomCorrectionPanel } from '@/components/floor-plan/RoomCorrectionPanel'

export default function ProjectFloorPlansTab() {
  const router = useRouter()
  const { id: projectId } = useParams() as { id: string }

  const [imageUrl, setImageUrl] = useState<string>('')
  const [rooms, setRooms] = useState<DetectedRoom[]>([])
  const [walls, setWalls] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [floorHeight, setFloorHeight] = useState(3.0)
  const [wallThickness, setWallThickness] = useState(0.23)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load plan and room details
  useEffect(() => {
    if (!projectId) return

    setIsLoading(true)

    // Load actual or fallback demo plan details
    const planData = Object.keys(localStorage)
      .filter(k => k.startsWith('bw_demo_plan_'))
      .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
      .find(p => p.project_id === projectId || p.id === projectId)

    const savedImage = localStorage.getItem(`bw_demo_file_data_${planData?.id || projectId}`)
    setImageUrl(savedImage || '')

    const isStaticDemo = projectId?.startsWith('demo_proj_') && (!planData || planData.filename === 'demo_layout.png' || planData.filename === 'demo_layout.jpg')
    const hasMockRooms = planData?.detected_data?.rooms?.some((r: any) => ['r1', 'r2', 'r3', 'r4'].includes(r.id))

    if (planData?.detected_data?.rooms && (!hasMockRooms || isStaticDemo)) {
      setRooms(planData.detected_data.rooms)
      setWalls(planData.detected_data.walls || [])
      setFloorHeight(planData.detected_data.floor_height_m || 3.0)
      setWallThickness(planData.detected_data.wall_thickness_m || 0.23)
    } else if (isStaticDemo) {
      // Default high fidelity demo layout
      const demoRooms = [
        {
          id: 'r1',
          label: 'Living Room',
          area_m2: 24.8,
          area_sqft: 267,
          perimeter_m: 20,
          length_m: 5.5,
          width_m: 4.5,
          polygon: [[100, 100], [466, 100], [466, 400], [100, 400]],
          centroid: [283, 250],
          bounding_box: [100, 100, 366, 300],
          aspect_ratio: 1.22,
          classification: {
            classified_label: 'Living Room',
            confidence: { overall: 0.92, ocr: { value: 0.95, source: 'OCR "LIVING"' } },
            low_confidence_flag: false,
            reason: 'High confidence match: OCR + geometry matches typical Living Room'
          }
        },
        {
          id: 'r2',
          label: 'Master Bedroom',
          area_m2: 18.0,
          area_sqft: 194,
          perimeter_m: 17,
          length_m: 4.5,
          width_m: 4.0,
          polygon: [[466, 100], [766, 100], [766, 366], [466, 366]],
          centroid: [616, 233],
          bounding_box: [466, 100, 300, 266],
          aspect_ratio: 1.12,
          classification: {
            classified_label: 'Master Bedroom',
            confidence: { overall: 0.74, ocr: { value: 0.60, source: 'Weak OCR' } },
            low_confidence_flag: true,
            reason: 'Review suggested: low confidence OCR. Geometry fits Master Bedroom.'
          }
        },
        {
          id: 'r3',
          label: 'Kitchen',
          area_m2: 12.0,
          area_sqft: 129,
          perimeter_m: 14,
          length_m: 4.0,
          width_m: 3.0,
          polygon: [[100, 400], [366, 400], [366, 600], [100, 600]],
          centroid: [233, 500],
          bounding_box: [100, 400, 266, 200],
          aspect_ratio: 1.33,
          classification: {
            classified_label: 'Kitchen',
            confidence: { overall: 0.88, ocr: { value: 0.90, source: 'OCR "KIT"' } },
            low_confidence_flag: false,
            reason: 'High confidence match: OCR label + fixture detection + geometry'
          }
        },
        {
          id: 'r4',
          label: 'Bathroom',
          area_m2: 5.0,
          area_sqft: 54,
          perimeter_m: 9,
          length_m: 2.5,
          width_m: 2.0,
          polygon: [[366, 400], [533, 400], [533, 533], [366, 533]],
          centroid: [449, 466],
          bounding_box: [366, 400, 167, 133],
          aspect_ratio: 1.25,
          classification: {
            classified_label: 'Bathroom',
            confidence: { overall: 0.58, ocr: { value: 0.0, source: 'No OCR' } },
            low_confidence_flag: true,
            reason: 'Critical review: inferred from toilet fixture detection alone.'
          }
        }
      ]
      const demoWalls = [
        { id: 'w1', start: [100, 100], end: [766, 100], length_px: 666, thickness_px: 15, wall_type: 'external' },
        { id: 'w2', start: [100, 100], end: [100, 600], length_px: 500, thickness_px: 15, wall_type: 'external' },
        { id: 'w3', start: [100, 400], end: [533, 400], length_px: 433, thickness_px: 10, wall_type: 'internal' },
        { id: 'w4', start: [466, 100], end: [466, 400], length_px: 300, thickness_px: 10, wall_type: 'internal' },
      ]
      setRooms(demoRooms)
      setWalls(demoWalls)

      // Save fallback rooms to localStorage so the 3D visualizer is in sync
      if (planData?.id) {
        planData.detected_data = {
          rooms: demoRooms,
          walls: demoWalls,
          floor_height_m: 3.0,
          wall_thickness_m: 0.23,
        }
        localStorage.setItem(`bw_demo_plan_${planData.id}`, JSON.stringify(planData))
      } else if (projectId) {
        const mockPlan = {
          id: projectId,
          project_id: projectId,
          filename: 'demo_layout.png',
          status: 'done',
          created_at: new Date().toISOString(),
          detected_data: {
            rooms: demoRooms,
            walls: demoWalls,
            floor_height_m: 3.0,
            wall_thickness_m: 0.23,
          }
        }
        localStorage.setItem(`bw_demo_plan_${projectId}`, JSON.stringify(mockPlan))
      }
    } else {
      setRooms([])
      setWalls([])
      // Clean up localStorage to remove mock demo rooms if saved inside a custom project
      if (planData && hasMockRooms) {
        delete planData.detected_data
        localStorage.setItem(`bw_demo_plan_${planData.id}`, JSON.stringify(planData))
      }
    }
    setIsLoading(false)
  }, [projectId])

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null

  const handleRoomRename = (roomId: string, newLabel: string) => {
    setRooms(prev =>
      prev.map(r => r.id === roomId ? {
        ...r,
        label: newLabel,
        classification: r.classification ? {
          ...r.classification,
          classified_label: newLabel,
          confidence: { ...r.classification.confidence, overall: 1.0 },
          low_confidence_flag: false,
          reason: 'User-corrected label'
        } : undefined
      } : r)
    )
    // Persist changes in localStorage to synchronize with BOQ/3D pages
    if (projectId) {
      const planKey = Object.keys(localStorage).find(k => k.startsWith('bw_demo_plan_') && (JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId || JSON.parse(localStorage.getItem(k) || '{}').id === projectId))
      if (planKey) {
        const plan = JSON.parse(localStorage.getItem(planKey) || '{}')
        if (plan.detected_data) {
          plan.detected_data.rooms = plan.detected_data.rooms.map((r: any) => r.id === roomId ? { ...r, label: newLabel } : r)
          localStorage.setItem(planKey, JSON.stringify(plan))
        }
      }
    }
  }

  const handleRoomDelete = (roomId: string) => {
    if (confirm('Delete this false room detection?')) {
      setRooms(prev => prev.filter(r => r.id !== roomId))
      setSelectedRoomId(null)
    }
  }

  const handleRoomMerge = (roomIdA: string, roomIdB: string) => {
    const roomA = rooms.find(r => r.id === roomIdA)
    const roomB = rooms.find(r => r.id === roomIdB)
    if (!roomA || !roomB) return

    setIsProcessing(true)
    setTimeout(() => {
      const mergedArea = roomA.area_m2 + roomB.area_m2
      const mergedSqft = roomA.area_sqft + roomB.area_sqft
      
      const mergedRoom: DetectedRoom = {
        id: `room_merged_${Date.now().toString().slice(-6)}`,
        label: `${roomA.label} + ${roomB.label}`,
        area_m2: mergedArea,
        area_sqft: mergedSqft,
        perimeter_m: roomA.perimeter_m + roomB.perimeter_m - 4.0,
        length_m: Math.max(roomA.length_m || 3.0, roomB.length_m || 3.0),
        width_m: Math.max(roomA.width_m || 3.0, roomB.width_m || 3.0),
        polygon: [...roomA.polygon, ...roomB.polygon].slice(0, 8),
        centroid: [(roomA.centroid[0] + roomB.centroid[0]) / 2, (roomA.centroid[1] + roomB.centroid[1]) / 2],
        bounding_box: roomA.bounding_box,
        aspect_ratio: 1.0,
      }

      setRooms(prev => [...prev.filter(r => r.id !== roomIdA && r.id !== roomIdB), mergedRoom])
      setSelectedRoomId(mergedRoom.id)
      setIsProcessing(false)
    }, 800)
  }

  const totalArea = rooms.reduce((sum, r) => sum + r.area_m2, 0)

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mb-3" />
        <p className="text-sm font-semibold">Loading blueprint assets...</p>
      </div>
    )
  }

  const lowConfidenceRooms = rooms.filter(
    (r) => (r.classification?.confidence?.overall || 1.0) < 0.90
  )

  return (
    <div className="space-y-6">
      {lowConfidenceRooms.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-black text-amber-600 dark:text-amber-500">Review Required</h4>
            <p className="text-[12px] text-black/50 dark:text-white/40 mt-0.5">
              The AI detected {lowConfidenceRooms.length} rooms with low confidence (&lt; 90%). Please review the highlighted orange sections on the floor plan drawing, rename or adjust them as needed.
            </p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Rooms', value: rooms.length, color: 'text-violet-500' },
          { label: 'Total Area', value: `${totalArea.toFixed(1)} m²`, color: 'text-emerald-500' },
          { label: 'Floor Height', value: `${floorHeight} m`, color: 'text-blue-500' },
          { label: 'Wall Thickness', value: `${(wallThickness * 1000).toFixed(0)} mm`, color: 'text-amber-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1E1E24] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-4">
            <p className="text-[11px] text-black/40 dark:text-white/30 font-medium">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="w-full">
        {/* Interactive SVG polygon overlay floor plan viewer */}
        <FloorPlanViewer
          imageUrl={imageUrl}
          imageWidth={1000}
          imageHeight={800}
          rooms={rooms}
          walls={walls}
          selectedRoomId={selectedRoomId}
          onRoomClick={(room) => setSelectedRoomId(room.id)}
          onRoomRename={handleRoomRename}
          onRoomDelete={handleRoomDelete}
          onRoomMerge={handleRoomMerge}
        />
      </div>

      {/* Room Dashboard Slide-out */}
      {selectedRoom && (
        <RoomDashboard
          room={selectedRoom}
          floorHeight={floorHeight}
          wallThickness={wallThickness}
          onClose={() => setSelectedRoomId(null)}
          onView3D={() => router.push(`/projects/${projectId}/3d-building`)}
        />
      )}
    </div>
  )
}
