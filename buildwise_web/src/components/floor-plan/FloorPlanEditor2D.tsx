'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MousePointer, Square, DoorOpen, AppWindow, Trash2, RotateCcw,
  Sparkles, CheckCircle2, AlertCircle, Plus, Eye, Layers, Settings,
  Calculator, ChevronRight, Ruler, Maximize2, RefreshCw, Edit3, X
} from 'lucide-react'
import type {
  FloorPlanAnalysisResult, AIRoom, AIDoor, AIWindow, AIWall, RoomType, DoorType
} from '@/lib/floor-plan-ai/types'
import { calculateTakeoff, TakeoffParams, EstimationResult } from '@/lib/estimation-engine'

// ── Types for Editor ──────────────────────────────────────────────────────────

export type EditorTool = 'select' | 'add_room' | 'add_wall' | 'add_door' | 'add_window' | 'delete'

interface FloorPlanEditor2DProps {
  initialResult: FloorPlanAnalysisResult
  imageDataUrl: string | null
  onSaveAndProceed: (updatedResult: FloorPlanAnalysisResult) => void
  onCancel?: () => void
}

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'master_bedroom', label: 'Master Bedroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining_room', label: 'Dining Room' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'passage', label: 'Passage' },
  { value: 'staircase', label: 'Staircase' },
  { value: 'store_room', label: 'Store Room' },
  { value: 'utility', label: 'Utility' },
  { value: 'pooja_room', label: 'Pooja Room' },
  { value: 'study', label: 'Study' },
]

const ROOM_COLORS: Record<string, string> = {
  living_room: '#10B981', master_bedroom: '#7C3AED', bedroom: '#8B5CF6',
  kitchen: '#F59E0B', dining_room: '#EC4899', bathroom: '#3B82F6',
  toilet: '#6366F1', balcony: '#22C55E', passage: '#9CA3AF',
  staircase: '#A855F7', store_room: '#6B7280', utility: '#4B5563',
  pooja_room: '#FB923C', study: '#0EA5E9', unknown: '#71717A',
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FloorPlanEditor2D({
  initialResult,
  imageDataUrl,
  onSaveAndProceed,
  onCancel,
}: FloorPlanEditor2DProps) {
  // ── Editor State ────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<AIRoom[]>(() => initialResult.rooms || [])
  const [walls, setWalls] = useState<AIWall[]>(() => initialResult.walls || [])
  const [doors, setDoors] = useState<AIDoor[]>(() => initialResult.doors || [])
  const [windows, setWindows] = useState<AIWindow[]>(() => initialResult.windows || [])
  const [scaleInfo, setScaleInfo] = useState(() => initialResult.scale || { px_per_meter: 40 })

  // Active Tool state
  const [activeTool, setActiveTool] = useState<EditorTool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'room' | 'wall' | 'door' | 'window' | null>(null)

  // Dragging vertex state
  const [draggedVertex, setDraggedVertex] = useState<{ roomId: string; vertexIdx: number } | null>(null)
  const [draggedElement, setDraggedElement] = useState<{ id: string; type: 'door' | 'window' } | null>(null)

  // New room points accumulator (for 'add_room' tool: supports arbitrary N points)
  const [newRoomPoints, setNewRoomPoints] = useState<[number, number][]>([])

  // Single Wall tool placement configuration
  const [newWallStart, setNewWallStart] = useState<[number, number] | null>(null)
  const [wallConfig, setWallConfig] = useState<{ wall_type: 'internal' | 'external' | 'partition'; thickness_m: number }>({
    wall_type: 'internal', thickness_m: 0.23,
  })

  // Door/Window tool placement configuration
  const [doorConfig, setDoorConfig] = useState<{ width_m: number; type: DoorType }>({ width_m: 0.9, type: 'single' })
  const [windowConfig, setWindowConfig] = useState<{ width_m: number; height_m: number; sill_height_m: number }>({
    width_m: 1.2, height_m: 1.2, sill_height_m: 0.9,
  })

  // Canvas bounds & mouse tracking
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState<[number, number] | null>(null)
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number }>({ w: 800, h: 600 })

  // Takeoff Params for real-time estimation preview
  const [takeoffParams] = useState<TakeoffParams>({
    building_type: 'house', num_floors: 1, floor_height: 3.0, wall_thickness: 0.23,
    slab_thickness: 0.12, concrete_grade: 'M20', steel_grade: 'Fe500', mortar_ratio: '1:5',
    foundation_type: 'isolated', roof_type: 'flat_rcc', brick_type: 'red_brick', waste_percentage: 5,
  })

  // ── Calculate Real-Time Material Takeoff ───────────────────────────────────
  const currentPlanResult = useMemo<FloorPlanAnalysisResult>(() => {
    const totalAreaM2 = rooms.reduce((s, r) => s + (r.area_m2 || 0), 0)
    return {
      ...initialResult,
      rooms,
      walls,
      doors,
      windows,
      room_count: rooms.length,
      door_count: doors.length,
      window_count: windows.length,
      total_area_m2: totalAreaM2,
      total_area_sqft: totalAreaM2 * 10.7639,
    }
  }, [initialResult, rooms, walls, doors, windows])

  const liveEstimation = useMemo<EstimationResult>(() => {
    return calculateTakeoff(currentPlanResult, takeoffParams)
  }, [currentPlanResult, takeoffParams])

  // Load natural image dimensions
  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.onload = () => {
      setImgDimensions({ w: img.naturalWidth || 800, h: img.naturalHeight || 600 })
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  // ── Scale conversion helper ─────────────────────────────────────────────────
  const pxPerMeter = scaleInfo.px_per_meter || 40

  const calculatePolygonAreaM2 = useCallback((poly: [number, number][]) => {
    if (poly.length < 3) return 0
    let area = 0
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length
      area += poly[i][0] * poly[j][1]
      area -= poly[j][0] * poly[i][1]
    }
    const areaPx = Math.abs(area) / 2
    return areaPx / (pxPerMeter * pxPerMeter)
  }, [pxPerMeter])

  // ── Mouse & Drag Event Handlers ─────────────────────────────────────────────
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>): [number, number] | null => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = imgDimensions.w / rect.width
    const scaleY = imgDimensions.h / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    return [x, y]
  }

  // ── Global Window Drag Listeners for Room Vertices ───────────────────────────
  useEffect(() => {
    if (!draggedVertex) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const scaleX = imgDimensions.w / rect.width
      const scaleY = imgDimensions.h / rect.height
      const x = Math.min(imgDimensions.w, Math.max(0, Math.round((e.clientX - rect.left) * scaleX)))
      const y = Math.min(imgDimensions.h, Math.max(0, Math.round((e.clientY - rect.top) * scaleY)))

      setRooms(prevRooms => prevRooms.map(room => {
        if (room.id !== draggedVertex.roomId) return room
        const newPoly = [...room.polygon]
        newPoly[draggedVertex.vertexIdx] = [x, y]
        const area_m2 = calculatePolygonAreaM2(newPoly)
        return {
          ...room,
          polygon: newPoly,
          area_m2,
          area_sqft: Math.round(area_m2 * 10.7639),
        }
      }))
    }

    const handleWindowMouseUp = () => {
      setDraggedVertex(null)
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [draggedVertex, imgDimensions, calculatePolygonAreaM2])

  // ── Global Window Drag Listeners for Doors & Windows ─────────────────────────
  useEffect(() => {
    if (!draggedElement) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const scaleX = imgDimensions.w / rect.width
      const scaleY = imgDimensions.h / rect.height
      const x = Math.min(imgDimensions.w, Math.max(0, Math.round((e.clientX - rect.left) * scaleX)))
      const y = Math.min(imgDimensions.h, Math.max(0, Math.round((e.clientY - rect.top) * scaleY)))

      if (draggedElement.type === 'door') {
        setDoors(prev => prev.map(d => d.id === draggedElement.id ? { ...d, center: [x, y] } : d))
      } else if (draggedElement.type === 'window') {
        setWindows(prev => prev.map(w => w.id === draggedElement.id ? { ...w, center: [x, y] } : w))
      }
    }

    const handleWindowMouseUp = () => {
      setDraggedElement(null)
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [draggedElement, imgDimensions])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e)
    if (coords) setMousePos(coords)
  }

  const handleMouseUp = () => {
    if (draggedVertex) setDraggedVertex(null)
  }

  // ── Finalize Custom Polygon Room ─────────────────────────────────────────────
  const finishNewRoom = useCallback((pts: [number, number][]) => {
    if (pts.length < 3) return
    const area_m2 = calculatePolygonAreaM2(pts)
    const cx = Math.round(pts.reduce((s, p) => s + p[0], 0) / pts.length)
    const cy = Math.round(pts.reduce((s, p) => s + p[1], 0) / pts.length)
    const minX = Math.min(...pts.map(p => p[0]))
    const minY = Math.min(...pts.map(p => p[1]))
    const maxX = Math.max(...pts.map(p => p[0]))
    const maxY = Math.max(...pts.map(p => p[1]))

    const newRoom: AIRoom = {
      id: `room_manual_${Date.now()}`,
      label: `New Room ${rooms.length + 1}`,
      room_type: 'bedroom',
      polygon: pts,
      centroid: [cx, cy],
      bounding_box: [minX, minY, maxX - minX, maxY - minY],
      area_m2,
      area_sqft: Math.round(area_m2 * 10.7639),
      perimeter_m: Math.round(area_m2 * 2.5),
      length_m: Math.round(((maxX - minX) / pxPerMeter) * 10) / 10,
      width_m: Math.round(((maxY - minY) / pxPerMeter) * 10) / 10,
      aspect_ratio: 1.14,
      floor_height_m: 3.0,
      adjacent_room_ids: [], door_ids: [], window_ids: [], wall_ids: [],
      classification: {
        classified_label: `New Room ${rooms.length + 1}`,
        room_type: 'bedroom',
        confidence: { overall: 1.0 },
        low_confidence_flag: false,
        flag_level: 'ok',
        reason: 'Manually defined custom room polygon',
        all_candidates: {},
        needs_user_confirmation: false,
      },
    }
    setRooms(r => [...r, newRoom])
    setNewRoomPoints([])
    setSelectedId(newRoom.id)
    setSelectedType('room')
    setActiveTool('select')
  }, [rooms.length, calculatePolygonAreaM2, pxPerMeter])

  // ── Add Corner Point to Existing Room Polygon ──────────────────────────────
  const handleAddCornerVertex = (roomId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room
      const poly = [...room.polygon]
      if (poly.length < 3) return room
      // Insert midpoint between vertex 0 and 1
      const p1 = poly[0]
      const p2 = poly[1]
      const mid: [number, number] = [Math.round((p1[0] + p2[0]) / 2), Math.round((p1[1] + p2[1]) / 2)]
      poly.splice(1, 0, mid)
      const area_m2 = calculatePolygonAreaM2(poly)
      return {
        ...room,
        polygon: poly,
        area_m2,
        area_sqft: Math.round(area_m2 * 10.7639),
      }
    }))
  }

  // ── Remove Vertex from Room Polygon ─────────────────────────────────────────
  const handleRemoveCornerVertex = (roomId: string, idx: number) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room
      if (room.polygon.length <= 3) return room // Minimum 3 points
      const poly = room.polygon.filter((_, i) => i !== idx)
      const area_m2 = calculatePolygonAreaM2(poly)
      return {
        ...room,
        polygon: poly,
        area_m2,
        area_sqft: Math.round(area_m2 * 10.7639),
      }
    }))
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e)
    if (!coords) return

    // ── Tool 1: Add Room Points (Arbitrary Polygon) ──
    if (activeTool === 'add_room') {
      // Check if clicking close to first point (to close polygon)
      if (newRoomPoints.length >= 3) {
        const first = newRoomPoints[0]
        const dist = Math.hypot(coords[0] - first[0], coords[1] - first[1])
        if (dist < 25) {
          finishNewRoom(newRoomPoints)
          return
        }
      }
      setNewRoomPoints(prev => [...prev, coords])
      return
    }

    // ── Tool 2: Add Single Wall Vector ──
    if (activeTool === 'add_wall') {
      if (!newWallStart) {
        setNewWallStart(coords)
      } else {
        const p1 = newWallStart
        const p2 = coords
        const lenPx = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        const lenM = Math.round((lenPx / pxPerMeter) * 100) / 100

        const newWall: AIWall = {
          id: `wall_manual_${Date.now()}`,
          start: p1,
          end: p2,
          length_px: lenPx,
          length_m: lenM,
          thickness_px: Math.round(wallConfig.thickness_m * pxPerMeter),
          thickness_m: wallConfig.thickness_m,
          wall_type: wallConfig.wall_type,
          room_ids: [], door_ids: [], window_ids: [],
          is_structural: wallConfig.wall_type === 'external',
          confidence: 1.0,
        }
        setWalls(w => [...w, newWall])
        setNewWallStart(null)
        setSelectedId(newWall.id)
        setSelectedType('wall')
        setActiveTool('select')
      }
      return
    }

    // ── Tool 2: Add Door ──
    if (activeTool === 'add_door') {
      const newDoor: AIDoor = {
        id: `door_manual_${Date.now()}`,
        wall_id: null,
        room_id: selectedId && selectedType === 'room' ? selectedId : null,
        adjacent_room_id: null,
        center: coords,
        width_m: doorConfig.width_m,
        height_m: 2.1,
        type: doorConfig.type,
        swing_direction: 'inward',
        swing_angle: 90,
        confidence: 1.0,
      }
      setDoors(d => [...d, newDoor])
      setSelectedId(newDoor.id)
      setSelectedType('door')
      setActiveTool('select')
      return
    }

    // ── Tool 3: Add Window ──
    if (activeTool === 'add_window') {
      const newWin: AIWindow = {
        id: `win_manual_${Date.now()}`,
        wall_id: null,
        room_id: selectedId && selectedType === 'room' ? selectedId : null,
        center: coords,
        width_m: windowConfig.width_m,
        height_m: windowConfig.height_m,
        sill_height_m: windowConfig.sill_height_m,
        confidence: 1.0,
      }
      setWindows(w => [...w, newWin])
      setSelectedId(newWin.id)
      setSelectedType('window')
      setActiveTool('select')
      return
    }
  }

  // ── Element Deletion ────────────────────────────────────────────────────────
  const handleDeleteSelected = () => {
    if (!selectedId) return
    if (selectedType === 'room') setRooms(r => r.filter(x => x.id !== selectedId))
    else if (selectedType === 'door') setDoors(d => d.filter(x => x.id !== selectedId))
    else if (selectedType === 'window') setWindows(w => w.filter(x => x.id !== selectedId))
    setSelectedId(null)
    setSelectedType(null)
  }

  // ── Reset to Initial AI Draft ────────────────────────────────────────────────
  const handleReset = () => {
    setRooms(initialResult.rooms || [])
    setWalls(initialResult.walls || [])
    setDoors(initialResult.doors || [])
    setWindows(initialResult.windows || [])
    setSelectedId(null)
    setSelectedType(null)
    setNewRoomPoints([])
  }

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedId), [rooms, selectedId])

  return (
    <div className="flex flex-col lg:flex-row gap-5 max-w-[1400px] mx-auto min-h-[750px]">
      
      {/* ── Left Main Workspace: Toolbar & Interactive 2D Canvas ── */}
      <div className="flex-1 bg-[#121216] border border-white/[0.08] rounded-[24px] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Top Control Bar */}
        <div className="p-3.5 bg-[#1A1A20] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          
          {/* Tool Buttons */}
          <div className="flex items-center gap-1 bg-[#24242C] p-1 rounded-xl border border-white/[0.06]">
            {[
              { id: 'select', label: 'Select / Move', icon: <MousePointer className="w-4 h-4" /> },
              { id: 'add_room', label: 'Add Room (Polygon)', icon: <Square className="w-4 h-4 text-emerald-400" /> },
              { id: 'add_wall', label: 'Add Wall', icon: <Layers className="w-4 h-4 text-purple-400" /> },
              { id: 'add_door', label: 'Add Door', icon: <DoorOpen className="w-4 h-4 text-amber-400" /> },
              { id: 'add_window', label: 'Add Window', icon: <AppWindow className="w-4 h-4 text-blue-400" /> },
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id as EditorTool); setNewRoomPoints([]); setNewWallStart(null) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  activeTool === tool.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                }`}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Context Actions */}
          <div className="flex items-center gap-2">
            {selectedId && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[12px] font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 text-[12px] font-bold flex items-center gap-1.5 border border-white/[0.06] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset AI Draft
            </button>
          </div>
        </div>

        {/* Dynamic Tool Sub-Bar */}
        <AnimatePresence mode="wait">
          {activeTool === 'add_wall' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 text-[12px] flex items-center gap-4 text-purple-300 font-semibold">
              <span>Single Wall Options:</span>
              <div className="flex items-center gap-2">
                <span>Type:</span>
                <select value={wallConfig.wall_type} onChange={e => setWallConfig({ ...wallConfig, wall_type: e.target.value as any })}
                  className="bg-[#1E1E24] text-white border border-purple-500/30 rounded-lg px-2 py-0.5 outline-none">
                  <option value="internal">Internal Wall (9")</option>
                  <option value="partition">Partition Wall (4.5")</option>
                  <option value="external">External Structural Wall</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Thickness:</span>
                <select value={wallConfig.thickness_m} onChange={e => setWallConfig({ ...wallConfig, thickness_m: parseFloat(e.target.value) })}
                  className="bg-[#1E1E24] text-white border border-purple-500/30 rounded-lg px-2 py-0.5 outline-none">
                  <option value={0.15}>0.15m (150mm / 4.5 inch)</option>
                  <option value={0.23}>0.23m (230mm / 9 inch)</option>
                </select>
              </div>
              <span className="text-[11px] opacity-70 ml-auto">
                {newWallStart ? '📍 Click Point 2 to complete wall' : '📍 Click Point 1 to start wall'}
              </span>
              {newWallStart && (
                <button onClick={() => setNewWallStart(null)} className="text-purple-400 underline hover:text-purple-200 text-xs">Cancel Wall</button>
              )}
            </motion.div>
          )}

          {activeTool === 'add_door' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[12px] flex items-center gap-4 text-amber-300 font-semibold">
              <span>Door Options:</span>
              <div className="flex items-center gap-2">
                <span>Type:</span>
                <select value={doorConfig.type} onChange={e => setDoorConfig({ ...doorConfig, type: e.target.value as DoorType })}
                  className="bg-[#1E1E24] text-white border border-amber-500/30 rounded-lg px-2 py-0.5 outline-none">
                  <option value="single">Single Flush</option>
                  <option value="double">Double Main Door</option>
                  <option value="sliding">Sliding Door</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Width:</span>
                <select value={doorConfig.width_m} onChange={e => setDoorConfig({ ...doorConfig, width_m: parseFloat(e.target.value) })}
                  className="bg-[#1E1E24] text-white border border-amber-500/30 rounded-lg px-2 py-0.5 outline-none">
                  <option value={0.75}>0.75m (Toilet/Bath)</option>
                  <option value={0.9}>0.90m (Standard Bedroom)</option>
                  <option value={1.0}>1.00m (Wide Entry)</option>
                  <option value={1.2}>1.20m (Double Main)</option>
                </select>
              </div>
              <span className="text-[11px] opacity-70 ml-auto">📍 Click anywhere on a wall to place door</span>
            </motion.div>
          )}

          {activeTool === 'add_window' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-[12px] flex items-center gap-4 text-blue-300 font-semibold">
              <span>Window Options:</span>
              <div className="flex items-center gap-2">
                <span>Width:</span>
                <select value={windowConfig.width_m} onChange={e => setWindowConfig({ ...windowConfig, width_m: parseFloat(e.target.value) })}
                  className="bg-[#1E1E24] text-white border border-blue-500/30 rounded-lg px-2 py-0.5 outline-none">
                  <option value={1.0}>1.00m</option>
                  <option value={1.2}>1.20m (Standard)</option>
                  <option value={1.5}>1.50m (Large)</option>
                  <option value={1.8}>1.80m (Balcony Glass)</option>
                </select>
              </div>
              <span className="text-[11px] opacity-70 ml-auto">📍 Click on a wall to place window</span>
            </motion.div>
          )}

          {activeTool === 'add_room' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-[12px] flex items-center justify-between text-emerald-300 font-semibold">
              <span>Click corners on the image to outline any shape ({newRoomPoints.length} points set)</span>
              <div className="flex items-center gap-2">
                {newRoomPoints.length >= 3 && (
                  <button
                    onClick={() => finishNewRoom(newRoomPoints)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1"
                  >
                    ✓ Finish Room Shape ({newRoomPoints.length} points)
                  </button>
                )}
                {newRoomPoints.length > 0 && (
                  <button onClick={() => setNewRoomPoints([])} className="text-emerald-400 underline hover:text-emerald-200 text-xs">Clear Points</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 2D Interactive Canvas Overlay ── */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          className="relative flex-1 bg-[#0A0A0E] flex items-center justify-center overflow-hidden cursor-crosshair min-h-[500px]"
        >
          {/* Background Floor Plan Image */}
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt="Floor Plan"
              className="w-full h-full object-contain pointer-events-none opacity-85 select-none"
            />
          ) : (
            <div className="text-white/20 font-bold text-sm flex items-center gap-2">
              <Layers className="w-5 h-5" /> No floor plan image loaded
            </div>
          )}

          {/* SVG Vector Interactive Overlay */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${imgDimensions.w} ${imgDimensions.h}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Layer 1: Room Polygon Fills */}
            {rooms.map(room => {
              const poly = room.polygon
              if (!poly || poly.length < 3) return null
              const isSelected = selectedId === room.id && selectedType === 'room'
              const color = ROOM_COLORS[room.room_type] || ROOM_COLORS.unknown
              const pointsStr = poly.map(p => `${p[0]},${p[1]}`).join(' ')

              return (
                <polygon
                  key={room.id}
                  points={pointsStr}
                  fill={color}
                  fillOpacity={isSelected ? 0.40 : 0.22}
                  stroke={isSelected ? '#A855F7' : color}
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeDasharray={isSelected ? '6,3' : 'none'}
                  className="cursor-pointer transition-all hover:fill-opacity-35"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedId(room.id)
                    setSelectedType('room')
                  }}
                />
              )
            })}

            {/* Layer 1.5: Render Standalone Walls / Partition Vectors */}
            {walls.map(w => {
              const isSelected = selectedId === w.id && selectedType === 'wall'
              const p1 = w.start
              const p2 = w.end
              if (!p1 || !p2) return null
              return (
                <g key={w.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedId(w.id); setSelectedType('wall') }}>
                  <line
                    x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
                    stroke={isSelected ? '#A855F7' : w.wall_type === 'partition' ? '#F59E0B' : '#C084FC'}
                    strokeWidth={Math.max(4, Math.round((w.thickness_m || 0.23) * pxPerMeter))}
                    strokeLinecap="round"
                    strokeOpacity={0.85}
                  />
                  {isSelected && (
                    <circle cx={(p1[0] + p2[0]) / 2} cy={(p1[1] + p2[1]) / 2} r={6} fill="#A855F7" stroke="#FFFFFF" strokeWidth={2} />
                  )}
                </g>
              )
            })}

            {/* Layer 2: Render Doors (Draggable!) */}
            {doors.map(door => {
              const isSelected = selectedId === door.id && selectedType === 'door'
              const [cx, cy] = door.center
              return (
                <g
                  key={door.id}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setSelectedId(door.id)
                    setSelectedType('door')
                    setDraggedElement({ id: door.id, type: 'door' })
                  }}
                >
                  {/* Invisible Hit Target (r=18) */}
                  <circle cx={cx} cy={cy} r={18} fill="transparent" />
                  <circle cx={cx} cy={cy} r={13} fill="#F59E0B" fillOpacity={isSelected ? 0.95 : 0.8} stroke="#FFFFFF" strokeWidth={2} />
                  <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight="black" style={{ pointerEvents: 'none' }}>D</text>
                </g>
              )
            })}

            {/* Layer 2: Render Windows (Draggable!) */}
            {windows.map(win => {
              const isSelected = selectedId === win.id && selectedType === 'window'
              const [cx, cy] = win.center
              return (
                <g
                  key={win.id}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setSelectedId(win.id)
                    setSelectedType('window')
                    setDraggedElement({ id: win.id, type: 'window' })
                  }}
                >
                  {/* Invisible Hit Target (r=18) */}
                  <rect x={cx - 16} y={cy - 14} width={32} height={28} rx={6} fill="transparent" />
                  <rect x={cx - 11} y={cy - 9} width={22} height={18} rx={4} fill="#3B82F6" fillOpacity={isSelected ? 0.95 : 0.8} stroke="#FFFFFF" strokeWidth={2} />
                  <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#FFFFFF" fontSize={9} fontWeight="black" style={{ pointerEvents: 'none' }}>W</text>
                </g>
              )
            })}

            {/* Layer 3: Room Label Badges */}
            {rooms.map(room => {
              const poly = room.polygon
              if (!poly || poly.length < 3) return null
              const color = ROOM_COLORS[room.room_type] || ROOM_COLORS.unknown
              const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
              const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length
              return (
                <g key={`label-${room.id}`} transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
                  <rect x={-45} y={-14} width={90} height={28} rx={6} fill="#1E1E24" fillOpacity={0.85} stroke={color} strokeWidth={1.5} />
                  <text x={0} y={-1} textAnchor="middle" fill="#FFFFFF" fontSize={11} fontWeight="bold">{room.label}</text>
                  <text x={0} y={10} textAnchor="middle" fill="#A1A1AA" fontSize={9}>{room.area_m2?.toFixed(1)} m²</text>
                </g>
              )
            })}

            {/* Layer 4: Corner Draggable Handles (TOP LAYER — Always clickable, even near doors/windows!) */}
            {rooms.filter(r => selectedId === r.id && selectedType === 'room').map(room => (
              <g key={`handles-${room.id}`}>
                {room.polygon.map((pt, idx) => (
                  <g
                    key={idx}
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setDraggedVertex({ roomId: room.id, vertexIdx: idx })
                    }}
                  >
                    {/* Invisible Hit Target (r=15) */}
                    <circle cx={pt[0]} cy={pt[1]} r={15} fill="transparent" />
                    {/* Outer Glow Ring */}
                    <circle cx={pt[0]} cy={pt[1]} r={9} fill="#A855F7" fillOpacity={0.35} />
                    {/* Visible Handle Dot */}
                    <circle cx={pt[0]} cy={pt[1]} r={6} fill="#A855F7" stroke="#FFFFFF" strokeWidth={2.5} />
                  </g>
                ))}
              </g>
            ))}

            {/* In-progress Single Wall Line Preview */}
            {newWallStart && mousePos && (
              <line
                x1={newWallStart[0]} y1={newWallStart[1]} x2={mousePos[0]} y2={mousePos[1]}
                stroke="#C084FC" strokeWidth={Math.max(4, Math.round(wallConfig.thickness_m * pxPerMeter))} strokeDasharray="6,3"
              />
            )}

            {/* In-progress New Room Points Line */}
            {newRoomPoints.length > 0 && (
              <g>
                <polyline
                  points={newRoomPoints.map(p => `${p[0]},${p[1]}`).join(' ') + (mousePos ? ` ${mousePos[0]},${mousePos[1]}` : '')}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  strokeDasharray="4,4"
                />
                {newRoomPoints.map((pt, i) => (
                  <circle key={i} cx={pt[0]} cy={pt[1]} r={6} fill="#10B981" stroke="#FFFFFF" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>

          {/* Footprint hint */}
          <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-[#1E1E24]/90 backdrop-blur-md border border-white/[0.08] text-[11px] text-white/50 flex items-center gap-2">
            <span>💡 Drag corner points to adjust shape. Use "+ Add Corner Handle" to create L-shaped rooms.</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Selected Element Inspector & Real-Time Civil Material Sync ── */}
      <div className="w-full lg:w-[380px] space-y-4 flex flex-col">
        
        {/* Selected Element Property Inspector */}
        <div className="bg-[#18181C] border border-white/[0.08] rounded-[24px] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Element Inspector</h3>
            </div>
            {selectedId && (
              <button onClick={() => { setSelectedId(null); setSelectedType(null) }} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedRoom ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-white/50 mb-1">Room Display Label</label>
                <input
                  type="text"
                  value={selectedRoom.label}
                  onChange={e => setRooms(r => r.map(x => x.id === selectedRoom.id ? { ...x, label: e.target.value } : x))}
                  className="w-full px-3 py-2 rounded-xl bg-[#24242C] border border-white/[0.1] text-white text-xs focus:border-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/50 mb-1">Room Classification</label>
                <select
                  value={selectedRoom.room_type}
                  onChange={e => setRooms(r => r.map(x => x.id === selectedRoom.id ? { ...x, room_type: e.target.value as RoomType } : x))}
                  className="w-full px-3 py-2 rounded-xl bg-[#24242C] border border-white/[0.1] text-white text-xs focus:border-violet-500 outline-none"
                >
                  {ROOM_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-[10px] text-white/40">Floor Area</p>
                  <p className="text-sm font-black text-violet-400 mt-0.5">{selectedRoom.area_m2?.toFixed(2)} m²</p>
                  <p className="text-[10px] text-white/30">({selectedRoom.area_sqft} sq ft)</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-[10px] text-white/40">Vertices</p>
                  <p className="text-sm font-black text-emerald-400 mt-0.5">{selectedRoom.polygon.length} points</p>
                  <p className="text-[10px] text-white/30">Polygon Shape</p>
                </div>
              </div>

              {/* Add Corner Handle Button */}
              <button
                type="button"
                onClick={() => handleAddCornerVertex(selectedRoom.id)}
                className="w-full py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Corner Handle (+ Vertex)
              </button>
            </div>
          ) : selectedId && selectedType === 'wall' ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-[11px] font-bold text-purple-300">Single Wall / Partition Element</p>
                {(() => {
                  const w = walls.find(x => x.id === selectedId)
                  if (!w) return null
                  return (
                    <div className="space-y-1 mt-2 text-white/80">
                      <p>📏 Length: <span className="font-bold text-white">{w.length_m.toFixed(2)} m</span></p>
                      <p>📐 Thickness: <span className="font-bold text-white">{(w.thickness_m * 1000).toFixed(0)} mm</span></p>
                      <p>🏷️ Type: <span className="font-bold uppercase text-purple-300">{w.wall_type}</span></p>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : selectedId && selectedType === 'door' ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[11px] font-bold text-amber-300">Door Opening Specs</p>
                {(() => {
                  const d = doors.find(x => x.id === selectedId)
                  if (!d) return null
                  return (
                    <div className="space-y-2 mt-2 text-white/80">
                      <div>
                        <label className="block text-[10px] text-white/50 mb-1">Door Width</label>
                        <select
                          value={d.width_m}
                          onChange={e => setDoors(prev => prev.map(x => x.id === d.id ? { ...x, width_m: parseFloat(e.target.value) } : x))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#24242C] border border-amber-500/30 text-white text-xs outline-none"
                        >
                          <option value={0.75}>0.75m (Toilet/Bath)</option>
                          <option value={0.9}>0.90m (Bedroom Standard)</option>
                          <option value={1.0}>1.00m (Main Entrance)</option>
                          <option value={1.2}>1.20m (Double Entry)</option>
                        </select>
                      </div>
                      <p className="text-[11px] text-amber-400 font-semibold pt-1">💡 Drag the orange (D) icon on canvas to move this door.</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : selectedId && selectedType === 'window' ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-[11px] font-bold text-blue-300">Window Opening Specs</p>
                {(() => {
                  const w = windows.find(x => x.id === selectedId)
                  if (!w) return null
                  return (
                    <div className="space-y-2 mt-2 text-white/80">
                      <div>
                        <label className="block text-[10px] text-white/50 mb-1">Window Width</label>
                        <select
                          value={w.width_m}
                          onChange={e => setWindows(prev => prev.map(x => x.id === w.id ? { ...x, width_m: parseFloat(e.target.value) } : x))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#24242C] border border-blue-500/30 text-white text-xs outline-none"
                        >
                          <option value={1.0}>1.00m (Small)</option>
                          <option value={1.2}>1.20m (Standard)</option>
                          <option value={1.5}>1.50m (Large)</option>
                          <option value={1.8}>1.80m (Full Glass)</option>
                        </select>
                      </div>
                      <p className="text-[11px] text-blue-400 font-semibold pt-1">💡 Drag the blue (W) icon on canvas to move this window.</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic py-2">Click any room polygon, wall line, door, or window on the canvas to inspect & adjust specs.</p>
          )}
        </div>

        {/* Real-Time Civil Material Takeoff Sync Dashboard */}
        <div className="bg-[#18181C] border border-white/[0.08] rounded-[24px] p-5 space-y-4 shadow-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Live Material Takeoff Sync</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
              &lt;1ms Instant
            </span>
          </div>

          {/* Live Takeoff Metrics */}
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {[
              { label: 'Bricks Count', value: liveEstimation.materials.bricks_count.toLocaleString(), unit: 'pcs', color: 'text-amber-400' },
              { label: 'Cement Bags', value: liveEstimation.materials.cement_bags.toLocaleString(), unit: 'bags (50kg)', color: 'text-violet-400' },
              { label: 'Sand Volume', value: liveEstimation.materials.sand_volume.toFixed(1), unit: 'm³', color: 'text-amber-300' },
              { label: 'Steel Rebar', value: liveEstimation.materials.steel_weight.toLocaleString(), unit: 'kg Fe500', color: 'text-blue-400' },
              { label: 'Plaster Area', value: Math.round(liveEstimation.materials.plaster_area).toLocaleString(), unit: 'm²', color: 'text-emerald-400' },
              { label: 'Openings', value: `${currentPlanResult.door_count} doors / ${currentPlanResult.window_count} wins`, unit: 'total', color: 'text-pink-400' },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-2xl bg-[#22222A] border border-white/[0.05]">
                <p className="text-[10px] font-medium text-white/40">{m.label}</p>
                <p className={`text-base font-black ${m.color} mt-0.5`}>{m.value}</p>
                <p className="text-[9.5px] text-white/30">{m.unit}</p>
              </div>
            ))}
          </div>

          {/* Estimated Total Material Cost */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-900/30 to-violet-600/20 border border-violet-500/30 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-violet-300 font-bold uppercase tracking-wider">Estimated Project Total</p>
              <p className="text-xl font-black text-white mt-0.5">₹{liveEstimation.total_cost ? liveEstimation.total_cost.toLocaleString() : '0'}</p>
            </div>
            <Calculator className="w-6 h-6 text-violet-400 opacity-60" />
          </div>

          {/* Save & Proceed Button */}
          <button
            onClick={() => onSaveAndProceed(currentPlanResult)}
            className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.01]"
          >
            <span>Proceed to Structural Parameters & 3D</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
