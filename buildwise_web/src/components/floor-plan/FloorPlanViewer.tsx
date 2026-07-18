'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import {
  ZoomIn, ZoomOut, Maximize2, Layers, Eye, EyeOff,
  Edit3, Trash2, Merge, Plus, Check, DoorOpen, Grid3x3,
  ShieldCheck,
} from 'lucide-react'
import type { AIRoom as DetectedRoom, AIWall as DetectedWall, AIDoor, AIWindow } from '@/lib/floor-plan-ai/types'

// Re-export types for consumers
export type { DetectedRoom, DetectedWall }

export interface FlaggedRoom {
  room_id: string
  current_label: string
  confidence: number
  flag_level: 'review' | 'critical'
  suggestion: string
  alternative_labels: { label: string; score: number }[]
}

interface FloorPlanViewerProps {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  rooms: DetectedRoom[]
  walls?: DetectedWall[]
  doors?: AIDoor[]
  windows?: AIWindow[]
  flaggedRooms?: FlaggedRoom[]
  onRoomClick?: (room: DetectedRoom) => void
  onRoomRename?: (roomId: string, newLabel: string) => void
  onRoomDelete?: (roomId: string) => void
  onRoomMerge?: (roomIdA: string, roomIdB: string) => void
  selectedRoomId?: string | null
}

// ── Room Colors ───────────────────────────────────────────────────────────────

const ROOM_COLORS: Record<string, { fill: string; stroke: string }> = {
  bedroom:        { fill: 'rgba(124, 58, 237, 0.15)',  stroke: '#7C3AED' },
  master_bedroom: { fill: 'rgba(139, 92, 246, 0.18)',  stroke: '#8B5CF6' },
  living_room:    { fill: 'rgba(16, 185, 129, 0.15)',  stroke: '#10B981' },
  kitchen:        { fill: 'rgba(245, 158, 11, 0.18)',  stroke: '#F59E0B' },
  bathroom:       { fill: 'rgba(59, 130, 246, 0.18)',  stroke: '#3B82F6' },
  toilet:         { fill: 'rgba(99, 102, 241, 0.15)',  stroke: '#6366F1' },
  dining_room:    { fill: 'rgba(236, 72, 153, 0.15)',  stroke: '#EC4899' },
  balcony:        { fill: 'rgba(34, 197, 94, 0.14)',   stroke: '#22C55E' },
  passage:        { fill: 'rgba(107, 114, 128, 0.10)', stroke: '#6B7280' },
  staircase:      { fill: 'rgba(168, 85, 247, 0.14)',  stroke: '#A855F7' },
  store_room:     { fill: 'rgba(156, 163, 175, 0.14)', stroke: '#9CA3AF' },
  utility:        { fill: 'rgba(75, 85, 99, 0.14)',    stroke: '#4B5563' },
  pooja_room:     { fill: 'rgba(251, 146, 60, 0.15)',  stroke: '#FB923C' },
  study:          { fill: 'rgba(14, 165, 233, 0.15)',  stroke: '#0EA5E9' },
  corridor:       { fill: 'rgba(107, 114, 128, 0.08)', stroke: '#6B7280' },
  entrance:       { fill: 'rgba(16, 185, 129, 0.10)',  stroke: '#10B981' },
  lobby:          { fill: 'rgba(16, 185, 129, 0.10)',  stroke: '#10B981' },
  garage:         { fill: 'rgba(107, 114, 128, 0.12)', stroke: '#4B5563' },
}

function getRoomColors(label: string): { fill: string; stroke: string } {
  const key = label.toLowerCase().replace(/\s+/g, '_').replace(/\d+/g, '').replace(/_+$/, '')
  return ROOM_COLORS[key] || { fill: 'rgba(124, 58, 237, 0.12)', stroke: '#7C3AED' }
}

// Confidence → heat-map color for confidence map mode
function confidenceToHeatColor(conf: number): { fill: string; stroke: string } {
  if (conf >= 0.90) return { fill: 'rgba(34,197,94,0.20)',  stroke: '#16A34A' }
  if (conf >= 0.75) return { fill: 'rgba(245,158,11,0.20)', stroke: '#D97706' }
  return                    { fill: 'rgba(239,68,68,0.22)',  stroke: '#DC2626' }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return '#22C55E'
  if (confidence >= 0.65) return '#F59E0B'
  return '#EF4444'
}

// ── Door arc SVG symbol ───────────────────────────────────────────────────────

function DoorSymbol({ door }: { door: AIDoor }) {
  const [cx, cy] = door.center
  const r = 18  // radius in SVG px
  const angle = door.swing_angle ?? 90
  const rad = (angle * Math.PI) / 180
  const ex = cx + r * Math.cos(rad)
  const ey = cy - r * Math.sin(rad)
  return (
    <g opacity={0.9}>
      {/* Door panel line */}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#374151" strokeWidth={1.5} />
      {/* Swing arc */}
      <path
        d={`M ${cx + r},${cy} A ${r},${r} 0 0,0 ${ex},${ey}`}
        fill="none"
        stroke="#374151"
        strokeWidth={1}
        strokeDasharray="3,2"
        opacity={0.6}
      />
      {/* Hinge point */}
      <circle cx={cx} cy={cy} r={2.5} fill="#374151" />
    </g>
  )
}

// ── Window line symbol ────────────────────────────────────────────────────────

function WindowSymbol({ window: win }: { window: AIWindow }) {
  const [cx, cy] = win.center
  const hw = 14
  return (
    <g opacity={0.85}>
      {/* Double parallel lines representing glass */}
      <line x1={cx - hw} y1={cy - 2} x2={cx + hw} y2={cy - 2} stroke="#3B82F6" strokeWidth={1.5} />
      <line x1={cx - hw} y1={cy + 2} x2={cx + hw} y2={cy + 2} stroke="#3B82F6" strokeWidth={1.5} />
      {/* End caps */}
      <line x1={cx - hw} y1={cy - 5} x2={cx - hw} y2={cy + 5} stroke="#3B82F6" strokeWidth={1} />
      <line x1={cx + hw} y1={cy - 5} x2={cx + hw} y2={cy + 5} stroke="#3B82F6" strokeWidth={1} />
    </g>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════

export function FloorPlanViewer({
  imageUrl, imageWidth, imageHeight, rooms, walls = [], doors = [], windows = [],
  flaggedRooms = [], onRoomClick, onRoomRename, onRoomDelete, onRoomMerge, selectedRoomId,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
  const [showRooms, setShowRooms] = useState(true)
  const [showWalls, setShowWalls] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showConfidence, setShowConfidence] = useState(true)
  const [showDoors, setShowDoors] = useState(true)
  const [showWindows, setShowWindows] = useState(true)
  const [confidenceMapMode, setConfidenceMapMode] = useState(false)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; room: DetectedRoom } | null>(null)
  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelection, setMergeSelection] = useState<string[]>([])

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 5))
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.3))
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const flagLookup = useMemo(() => {
    const map: Record<string, FlaggedRoom> = {}
    flaggedRooms.forEach(f => { map[f.room_id] = f })
    return map
  }, [flaggedRooms])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }
  const handleMouseUp = () => setIsPanning(false)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.3, Math.min(z + (e.deltaY > 0 ? -0.1 : 0.1), 5)))
  }, [])

  const handleRoomClick = (room: DetectedRoom) => {
    if (mergeMode) {
      setMergeSelection(prev => {
        const next = prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id]
        if (next.length === 2 && onRoomMerge) {
          onRoomMerge(next[0], next[1])
          setMergeMode(false)
          return []
        }
        return next
      })
    } else {
      onRoomClick?.(room)
    }
  }

  const polygonToSvgPoints = (polygon: number[][]): string =>
    polygon.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <div className="relative rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-[#F8F8FA] dark:bg-[#18181C]">

      {/* ── Toolbar ── */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-[#1E1E24]/90 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.06] shadow-lg flex-wrap max-w-[260px]">
        <button onClick={zoomIn} className="p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
        <button onClick={zoomOut} className="p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button onClick={resetView} className="p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05]" title="Reset"><Maximize2 className="w-3.5 h-3.5" /></button>
        <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08]" />
        <button onClick={() => setShowRooms(!showRooms)} className={`p-2 rounded-lg transition-all ${showRooms ? 'bg-violet-500/10 text-violet-500' : 'hover:bg-black/[0.05]'}`} title="Toggle Rooms"><Layers className="w-3.5 h-3.5" /></button>
        <button onClick={() => setShowLabels(!showLabels)} className={`p-2 rounded-lg transition-all ${showLabels ? 'bg-violet-500/10 text-violet-500' : 'hover:bg-black/[0.05]'}`} title="Toggle Labels">{showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
        <button onClick={() => setShowConfidence(!showConfidence)} className={`p-2 rounded-lg transition-all ${showConfidence ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-black/[0.05]'}`} title="Toggle Confidence %"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setConfidenceMapMode(!confidenceMapMode)} className={`p-2 rounded-lg transition-all ${confidenceMapMode ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-black/[0.05]'}`} title="Confidence Heat Map"><ShieldCheck className="w-3.5 h-3.5" /></button>
        <button onClick={() => setShowDoors(!showDoors)} className={`p-2 rounded-lg transition-all ${showDoors ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400' : 'hover:bg-black/[0.05]'}`} title="Toggle Doors"><DoorOpen className="w-3.5 h-3.5" /></button>
        <button onClick={() => setShowWindows(!showWindows)} className={`p-2 rounded-lg transition-all ${showWindows ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-black/[0.05]'}`} title="Toggle Windows"><Grid3x3 className="w-3.5 h-3.5" /></button>
        {onRoomMerge && (
          <>
            <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08]" />
            <button onClick={() => { setMergeMode(!mergeMode); setMergeSelection([]) }} className={`p-2 rounded-lg transition-all ${mergeMode ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-black/[0.05]'}`} title="Merge Rooms"><Merge className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>

      {/* Merge mode banner */}
      {mergeMode && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-amber-500/90 text-white text-[11px] font-bold shadow-lg">
          Select 2 rooms to merge ({mergeSelection.length}/2)
        </div>
      )}

      {/* Confidence map legend */}
      {confidenceMapMode && (
        <div className="absolute bottom-10 left-3 z-20 p-2 rounded-xl bg-white/90 dark:bg-[#1E1E24]/90 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.06] shadow-lg space-y-1">
          <p className="text-[9px] font-black uppercase text-black/40 dark:text-white/30 tracking-wider">Confidence Map</p>
          {[{ label: '≥ 90% High', color: '#16A34A' }, { label: '75–89% Med', color: '#D97706' }, { label: '< 75% Low', color: '#DC2626' }].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.7 }} />
              <span className="text-[10px] text-black/50 dark:text-white/40">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#1E1E24]/90 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.06] text-[11px] font-bold text-black/50 dark:text-white/40">
        {Math.round(zoom * 100)}%
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative w-full h-[650px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsPanning(false); setHoveredRoom(null); setTooltip(null) }}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 origin-center transition-transform duration-75"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* Floor Plan Image */}
          {imageUrl && (
            imageUrl.startsWith('data:application/pdf') || imageUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe src={`${imageUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full border-0 pointer-events-none" title="Floor Plan Drawing" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Floor Plan" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            )
          )}

          {/* SVG Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${imageWidth || 1000} ${imageHeight || 1000}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Wall segments */}
            {showWalls && walls.map((wall) => (
              <line
                key={wall.id}
                x1={wall.start[0]} y1={wall.start[1]}
                x2={wall.end[0]} y2={wall.end[1]}
                stroke={wall.wall_type === 'external' ? '#1E1E2E' : '#6B7280'}
                strokeWidth={Math.max((wall.thickness_px || 10) * 0.25, 1.5)}
                strokeLinecap="round"
                opacity={0.65}
              />
            ))}

            {/* Room Polygons */}
            {showRooms && rooms.map((room) => {
              if (!room.polygon || room.polygon.length < 3) return null
              const isSelected = selectedRoomId === room.id
              const isHovered = hoveredRoom === room.id
              const isMergeTarget = mergeSelection.includes(room.id)
              const confidence = room.classification?.confidence?.overall ?? 1
              const colors = confidenceMapMode
                ? confidenceToHeatColor(confidence)
                : getRoomColors(room.label)
              const flagged = flagLookup[room.id]

              return (
                <g key={room.id}>
                  <polygon
                    points={polygonToSvgPoints(room.polygon)}
                    fill={isSelected ? 'rgba(124,58,237,0.30)' : isMergeTarget ? 'rgba(245,158,11,0.35)' : isHovered ? 'rgba(124,58,237,0.22)' : confidence < 0.90 && !confidenceMapMode ? 'rgba(245,158,11,0.15)' : colors.fill}
                    stroke={isSelected || isHovered ? '#7C3AED' : isMergeTarget ? '#F59E0B' : confidence < 0.90 && !confidenceMapMode ? '#F59E0B' : flagged ? '#EF4444' : colors.stroke}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : confidence < 0.90 ? 2 : 1.5}
                    strokeDasharray={isSelected ? 'none' : confidence < 0.90 && !confidenceMapMode ? '5,4' : flagged ? '6,3' : 'none'}
                    className="cursor-pointer pointer-events-auto"
                    style={{ transition: 'all 150ms ease' }}
                    onClick={e => { e.stopPropagation(); handleRoomClick(room) }}
                    onMouseEnter={e => {
                      setHoveredRoom(room.id)
                      const rect = containerRef.current?.getBoundingClientRect()
                      if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, room })
                    }}
                    onMouseLeave={() => { setHoveredRoom(null); setTooltip(null) }}
                  />

                  {/* Room label */}
                  {showLabels && room.centroid && (
                    <g>
                      <rect
                        x={room.centroid[0] - 44}
                        y={room.centroid[1] - 13}
                        width={88}
                        height={showConfidence ? 34 : 22}
                        rx={5}
                        fill="white"
                        fillOpacity={0.88}
                        stroke={colors.stroke}
                        strokeWidth={0.5}
                      />
                      <text x={room.centroid[0]} y={room.centroid[1]} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold" fill={colors.stroke} className="pointer-events-none">
                        {room.label}
                      </text>
                      {showConfidence && (
                        <text x={room.centroid[0]} y={room.centroid[1] + 13} textAnchor="middle" dominantBaseline="middle" fontSize={8} fontWeight="600" fill={getConfidenceColor(confidence)} className="pointer-events-none">
                          {Math.round(confidence * 100)}% · {room.area_m2?.toFixed(1)}m²
                        </text>
                      )}
                      {/* Low confidence warning dot */}
                      {confidence < 0.90 && (
                        <g transform={`translate(${room.centroid[0] + 37}, ${room.centroid[1] - 10})`}>
                          <circle r={6} fill={confidence < 0.75 ? '#EF4444' : '#F59E0B'} />
                          <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="white" fontWeight="bold">!</text>
                        </g>
                      )}
                    </g>
                  )}

                  {/* Hover action buttons */}
                  {isHovered && !mergeMode && (
                    <g className="pointer-events-auto">
                      {onRoomRename && (
                        <g className="cursor-pointer" onClick={e => { e.stopPropagation(); setEditingRoomId(room.id); setEditLabel(room.label) }}>
                          <circle cx={room.centroid[0] - 22} cy={room.centroid[1] - 28} r={9} fill="white" stroke="#7C3AED" strokeWidth={1} />
                          <text x={room.centroid[0] - 22} y={room.centroid[1] - 27} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#7C3AED">✎</text>
                        </g>
                      )}
                      {onRoomDelete && (
                        <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onRoomDelete(room.id) }}>
                          <circle cx={room.centroid[0] + 22} cy={room.centroid[1] - 28} r={9} fill="white" stroke="#EF4444" strokeWidth={1} />
                          <text x={room.centroid[0] + 22} y={room.centroid[1] - 27} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#EF4444">✕</text>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              )
            })}

            {/* Door symbols */}
            {showDoors && doors.map(door => (
              <DoorSymbol key={door.id} door={door} />
            ))}

            {/* Window symbols */}
            {showWindows && windows.map(win => (
              <WindowSymbol key={win.id} window={win} />
            ))}
          </svg>
        </div>

        {/* ── Rename Modal ── */}
        {editingRoomId && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#252530] rounded-2xl shadow-2xl p-5 min-w-[280px] border border-black/[0.08] dark:border-white/[0.08]">
              <p className="text-[13px] font-bold text-black/70 dark:text-white/70 mb-3">Rename Room</p>
              <input
                type="text"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') { onRoomRename?.(editingRoomId, editLabel.trim()); setEditingRoomId(null) }
                  if (e.key === 'Escape') setEditingRoomId(null)
                }}
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => { onRoomRename?.(editingRoomId, editLabel.trim()); setEditingRoomId(null) }} className="flex-1 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-[12px] font-bold hover:bg-violet-600">Save</button>
                <button onClick={() => setEditingRoomId(null)} className="flex-1 px-3 py-1.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.05] text-[12px] font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tooltip ── */}
        {tooltip && (
          <div className="absolute z-30 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
            <div className="bg-white dark:bg-[#252530] rounded-xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] p-3 min-w-[190px]">
              <p className="text-[12px] font-black text-violet-500">{tooltip.room.label}</p>
              <div className="mt-1.5 space-y-0.5 text-[11px] text-black/50 dark:text-white/40">
                <p>Area: <span className="font-bold text-black/70 dark:text-white/70">{tooltip.room.area_m2?.toFixed(1)} m² ({tooltip.room.area_sqft?.toFixed(0)} sqft)</span></p>
                <p>Size: <span className="font-bold text-black/70 dark:text-white/70">{tooltip.room.length_m?.toFixed(1)} × {tooltip.room.width_m?.toFixed(1)} m</span></p>
                <p>Perimeter: <span className="font-bold text-black/70 dark:text-white/70">{tooltip.room.perimeter_m?.toFixed(1)} m</span></p>
                {tooltip.room.classification && (
                  <p>Confidence: <span className="font-bold" style={{ color: getConfidenceColor(tooltip.room.classification.confidence.overall) }}>
                    {Math.round(tooltip.room.classification.confidence.overall * 100)}%
                  </span></p>
                )}
                {tooltip.room.door_ids?.length > 0 && <p>Doors: <span className="font-bold text-black/70 dark:text-white/70">{tooltip.room.door_ids.length}</span></p>}
                {tooltip.room.window_ids?.length > 0 && <p>Windows: <span className="font-bold text-black/70 dark:text-white/70">{tooltip.room.window_ids.length}</span></p>}
                {tooltip.room.polygon && (
                  <p>Shape: <span className="font-bold text-black/70 dark:text-white/70">{tooltip.room.polygon.length}-sided polygon</span></p>
                )}
              </div>
              {tooltip.room.classification?.reason && (
                <p className="text-[10px] text-violet-400/80 mt-1.5 italic leading-relaxed">{tooltip.room.classification.reason}</p>
              )}
              <p className="text-[10px] text-violet-400 mt-1 font-medium">Click for details →</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Layers className="w-12 h-12 text-black/10 dark:text-white/10 mb-3" />
            <p className="text-[14px] font-bold text-black/30 dark:text-white/20">No Floor Plan Loaded</p>
            <p className="text-[12px] text-black/20 dark:text-white/15">Upload a blueprint to see the interactive view</p>
          </div>
        )}
      </div>
    </div>
  )
}
