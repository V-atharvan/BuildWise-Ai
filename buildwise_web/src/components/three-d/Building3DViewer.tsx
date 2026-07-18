'use client'

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text, Grid, PerspectiveCamera, Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  Eye, EyeOff, Box, Layers, RotateCcw, DoorOpen, AppWindow,
  Footprints,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Room3D {
  id: string
  label: string
  polygon: number[][]
  area_m2: number
  perimeter_m?: number
  classification?: { confidence: { overall: number } }
}

interface Door3D {
  id: string
  center: number[]     // pixel coords
  width_m: number
  room_id?: string | null
  swing_angle?: number
}

interface Window3D {
  id: string
  center: number[]
  width_m: number
  height_m?: number
  sill_height_m?: number
  room_id?: string | null
}

interface Building3DViewerProps {
  rooms: Room3D[]
  doors?: Door3D[]
  windows?: Window3D[]
  floorHeight?: number
  scaleFactor?: number
  onRoomClick?: (roomId: string) => void
  onWallClick?: (wall: { roomId: string; wallIndex: number; length: number; thickness: number }) => void
  selectedRoomId?: string | null
  selectedWallKey?: string | null
}

// ── Room color map ────────────────────────────────────────────────────────────

const ROOM_3D_COLORS: Record<string, string> = {
  bedroom: '#8B5CF6', master_bedroom: '#7C3AED', living_room: '#10B981',
  kitchen: '#F59E0B', bathroom: '#3B82F6', toilet: '#6366F1',
  dining_room: '#EC4899', balcony: '#22C55E', passage: '#9CA3AF',
  staircase: '#A855F7', store_room: '#6B7280', utility: '#4B5563',
  pooja_room: '#FB923C', study: '#0EA5E9', corridor: '#9CA3AF',
  entrance: '#10B981', lobby: '#10B981', garage: '#6B7280',
}

function getRoomColor(label: string): string {
  const key = label.toLowerCase().replace(/\s+/g, '_').replace(/\d+/g, '').replace(/_+$/, '')
  return ROOM_3D_COLORS[key] || '#7C3AED'
}

// ── Room Mesh with proper walls ───────────────────────────────────────────────

function RoomMesh({
  room, floorHeight, isSelected, isHovered, showWalls, showLabels,
  selectedWallKey, wallThickness, onHover, onClick, onDoubleClick, onWallClick,
}: {
  room: Room3D; floorHeight: number; isSelected: boolean; isHovered: boolean
  showWalls: boolean; showLabels: boolean; selectedWallKey: string | null
  wallThickness: number
  onHover: (h: boolean) => void; onClick: () => void; onDoubleClick: () => void
  onWallClick?: (roomId: string, wallIndex: number, length: number, thickness: number) => void
}) {
  const color = getRoomColor(room.label)
  const poly = room.polygon
  if (!poly || poly.length < 3) return null

  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length

  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(poly[0][0], poly[0][1])
    for (let i = 1; i < poly.length; i++) s.lineTo(poly[i][0], poly[i][1])
    s.closePath()
    return s
  }, [poly])

  const wallSegments = useMemo(() => {
    return poly.map((p1, i) => {
      const p2 = poly[(i + 1) % poly.length]
      const dx = p2[0] - p1[0], dy = p2[1] - p1[1]
      return { start: p1, end: p2, length: Math.sqrt(dx*dx + dy*dy), angle: Math.atan2(dy, dx) }
    })
  }, [poly])

  const opacity = isSelected ? 0.55 : isHovered ? 0.45 : 0.28

  return (
    <group>
      {/* Floor slab */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}
        onClick={e => { e.stopPropagation(); onClick() }}
        onDoubleClick={e => { e.stopPropagation(); onDoubleClick() }}
        onPointerEnter={e => { e.stopPropagation(); onHover(true) }}
        onPointerLeave={() => onHover(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, floorHeight, 0]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#FAFAFA" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Walls */}
      {showWalls && wallSegments.map((seg, i) => {
        const midX = (seg.start[0] + seg.end[0]) / 2
        const midY = (seg.start[1] + seg.end[1]) / 2
        const wallKey = `${room.id}-${i}`
        const isWallSelected = selectedWallKey === wallKey
        return (
          <mesh
            key={i}
            position={[midX, floorHeight / 2, -midY]}
            rotation={[0, -seg.angle, 0]}
            onClick={e => { e.stopPropagation(); onWallClick?.(room.id, i, seg.length, wallThickness) }}
          >
            <boxGeometry args={[seg.length, floorHeight, wallThickness]} />
            <meshStandardMaterial
              color={isWallSelected ? '#A855F7' : isSelected ? '#C084FC' : '#E5E7EB'}
              transparent
              opacity={isWallSelected ? 0.95 : isSelected ? 0.80 : 0.60}
            />
            {isWallSelected && (
              <Html position={[0, floorHeight * 0.65, 0]} center distanceFactor={8}>
                <div className="bg-[#1E1E24]/95 text-white border border-white/[0.08] p-3 rounded-2xl shadow-xl whitespace-nowrap text-[11px] font-semibold space-y-1 backdrop-blur-md">
                  <p className="text-violet-400 font-bold border-b border-white/[0.06] pb-1 uppercase tracking-wider text-[9px]">Selected Wall</p>
                  <p>📏 Length: <span className="font-bold text-violet-300">{seg.length.toFixed(2)} m</span></p>
                  <p>📐 Thickness: <span className="font-bold text-violet-300">{(wallThickness * 1000).toFixed(0)} mm</span></p>
                  <p>🧱 Volume: <span className="font-bold text-violet-300">{(seg.length * floorHeight * wallThickness).toFixed(2)} m³</span></p>
                  <p>👷 Bricks: <span className="font-bold text-emerald-400">{Math.round(seg.length * floorHeight * wallThickness * 500).toLocaleString()} pcs</span></p>
                </div>
              </Html>
            )}
          </mesh>
        )
      })}

      {/* Room label */}
      {showLabels && (
        <>
          <Text position={[cx, floorHeight * 0.6, -cy]} fontSize={0.45} color={color} fontWeight={700} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#FFFFFF">
            {room.label}
          </Text>
          <Text position={[cx, floorHeight * 0.38, -cy]} fontSize={0.28} color="#888888" anchorX="center" anchorY="middle">
            {room.area_m2?.toFixed(1)} m²
          </Text>
        </>
      )}

      {/* Selection outline */}
      {isSelected && (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.04, 0]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color="#7C3AED" transparent opacity={0.25} side={THREE.DoubleSide} wireframe />
        </mesh>
      )}
    </group>
  )
}

// ── Door arch cutout marker (visual indicator) ────────────────────────────────

function DoorMarker({ door, scaleFactor, floorHeight }: { door: Door3D; scaleFactor: number; floorHeight: number }) {
  const [cx, cz] = door.center
  const w = door.width_m
  const h = Math.min(door.width_m * 2.33, floorHeight * 0.85)  // door height

  // Find min bounds of all rooms for centering
  const x = cx * scaleFactor
  const z = cz * scaleFactor

  return (
    <group position={[x, 0, -z]}>
      {/* Door opening indicator — thin colored plane */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 0.02]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.35} />
      </mesh>
      {/* Door frame lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, 0.04)]} />
        <lineBasicMaterial color="#374151" />
      </lineSegments>
    </group>
  )
}

// ── Window marker ─────────────────────────────────────────────────────────────

function WindowMarker({ window: win, scaleFactor, floorHeight }: { window: Window3D; scaleFactor: number; floorHeight: number }) {
  const [cx, cz] = win.center
  const w = win.width_m
  const h = win.height_m || 1.2
  const sill = win.sill_height_m || 0.9

  const x = cx * scaleFactor
  const z = cz * scaleFactor

  return (
    <group position={[x, sill, -z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color="#93C5FD" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

// ── Camera tweener ────────────────────────────────────────────────────────────

function CameraTweener({ target, preset, walkthroughMode }: {
  target: THREE.Vector3 | null; preset: string; walkthroughMode: boolean
}) {
  const { camera, controls } = useThree()
  const [currentTarget, setCurrentTarget] = useState<THREE.Vector3 | null>(null)

  const lastTargetRef = useRef<THREE.Vector3 | null>(null)

  // Trigger animation when target changes (compare coordinates, not object references)
  useEffect(() => {
    if (target) {
      const isSame = lastTargetRef.current && 
                     lastTargetRef.current.x === target.x && 
                     lastTargetRef.current.y === target.y && 
                     lastTargetRef.current.z === target.z

      if (!isSame) {
        lastTargetRef.current = target.clone()
        setCurrentTarget(target.clone())
      }
    } else {
      lastTargetRef.current = null
      setCurrentTarget(null)
    }
  }, [target])

  // Manage presets directly
  useEffect(() => {
    if (!controls) return
    const ctrl = controls as any
    if (preset === 'top') { ctrl.target.set(0,0,0); camera.position.set(0, 24, 0.001); ctrl.update() }
    else if (preset === 'front') { ctrl.target.set(0,0,0); camera.position.set(0, 2.5, 20); ctrl.update() }
    else if (preset === 'side') { ctrl.target.set(0,0,0); camera.position.set(20, 2.5, 0); ctrl.update() }
    else if (preset === 'perspective') { ctrl.target.set(0,0,0); camera.position.set(14, 11, 14); ctrl.update() }
    else if (preset === 'walkthrough') { ctrl.target.set(0, 1.7, 0); camera.position.set(0, 1.7, 5); ctrl.update() }
  }, [preset, camera, controls])

  useFrame(() => {
    if (currentTarget && controls && (preset === 'perspective' || preset === 'walkthrough')) {
      const ctrl = controls as any
      
      const height = walkthroughMode ? 1.8 : 8
      const dist = walkthroughMode ? 3 : 7
      const destPos = new THREE.Vector3(currentTarget.x, currentTarget.y + height, currentTarget.z + dist)

      // Calculate remaining distances
      const targetDist = ctrl.target.distanceTo(currentTarget)
      const camDist = camera.position.distanceTo(destPos)

      // Once we are close enough to the target, stop fighting user's OrbitControls
      if (targetDist < 0.05 && camDist < 0.05) {
        setCurrentTarget(null)
        return
      }

      ctrl.target.lerp(currentTarget, 0.08)
      camera.position.lerp(destPos, 0.08)
      ctrl.update()
    }
  })
  return null
}

// ── Main Scene ────────────────────────────────────────────────────────────────

function Scene({
  rooms, doors, windows, floorHeight, scaleFactor, selectedRoomId, selectedWallKey,
  showWalls, showLabels, showDoors, showWindows, cameraPreset, walkthroughMode,
  wallThickness, onRoomClick, onWallClick,
}: {
  rooms: Room3D[]; doors: Door3D[]; windows: Window3D[]
  floorHeight: number; scaleFactor: number
  selectedRoomId: string | null; selectedWallKey: string | null
  showWalls: boolean; showLabels: boolean; showDoors: boolean; showWindows: boolean
  cameraPreset: string; walkthroughMode: boolean; wallThickness: number
  onRoomClick: (id: string) => void
  onWallClick?: (roomId: string, wallIndex: number, length: number, thickness: number) => void
}) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null)

  const transformedRooms = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rooms.forEach(r => r.polygon?.forEach(([x, y]) => {
      const sx = x * scaleFactor, sy = y * scaleFactor
      if (sx < minX) minX = sx; if (sy < minY) minY = sy
      if (sx > maxX) maxX = sx; if (sy > maxY) maxY = sy
    }))
    const cX = (minX + maxX) / 2, cY = (minY + maxY) / 2
    return rooms.map(r => ({
      ...r,
      polygon: r.polygon?.map(([x, y]) => [x * scaleFactor - cX, y * scaleFactor - cY]) || [],
    }))
  }, [rooms, scaleFactor])

  const centerOffset = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rooms.forEach(r => r.polygon?.forEach(([x, y]) => {
      const sx = x * scaleFactor, sy = y * scaleFactor
      if (sx < minX) minX = sx; if (sy < minY) minY = sy
      if (sx > maxX) maxX = sx; if (sy > maxY) maxY = sy
    }))
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  }, [rooms, scaleFactor])

  const handleDoubleClick = (room: any) => {
    const poly = room.polygon
    if (poly?.length > 0) {
      const cx = poly.reduce((s: number, p: number[]) => s + p[0], 0) / poly.length
      const cy = poly.reduce((s: number, p: number[]) => s + p[1], 0) / poly.length
      setCameraTarget(new THREE.Vector3(cx, 0, -cy))
    }
  }

  useEffect(() => {
    if (!selectedRoomId) { setCameraTarget(null); return }
    const room = transformedRooms.find(r => r.id === selectedRoomId)
    if (room) handleDoubleClick(room)
  }, [selectedRoomId, transformedRooms])

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[10, 20, 10]} intensity={0.85} castShadow />
      <directionalLight position={[-10, 15, -10]} intensity={0.30} />
      <pointLight position={[0, 10, 0]} intensity={0.25} />

      <Grid args={[50, 50]} position={[0, 0, 0]} cellSize={1} cellThickness={0.5} cellColor="#E5E7EB" sectionSize={5} sectionThickness={1} sectionColor="#D1D5DB" fadeDistance={30} fadeStrength={1} infiniteGrid />

      {transformedRooms.map(room => (
        <RoomMesh key={room.id} room={room} floorHeight={floorHeight}
          isSelected={selectedRoomId === room.id} isHovered={hoveredRoom === room.id}
          showWalls={showWalls} showLabels={showLabels} selectedWallKey={selectedWallKey}
          wallThickness={wallThickness}
          onHover={h => setHoveredRoom(h ? room.id : null)}
          onClick={() => onRoomClick(room.id)}
          onDoubleClick={() => handleDoubleClick(room)}
          onWallClick={onWallClick}
        />
      ))}

      {/* Door markers */}
      {showDoors && doors.map(door => (
        <DoorMarker key={door.id} door={{
          ...door,
          center: [door.center[0] * scaleFactor - centerOffset.x, door.center[1] * scaleFactor - centerOffset.y],
        }} scaleFactor={1} floorHeight={floorHeight} />
      ))}

      {/* Window markers */}
      {showWindows && windows.map(win => (
        <WindowMarker key={win.id} window={{
          ...win,
          center: [win.center[0] * scaleFactor - centerOffset.x, win.center[1] * scaleFactor - centerOffset.y],
        }} scaleFactor={1} floorHeight={floorHeight} />
      ))}

      <CameraTweener target={cameraTarget} preset={cameraPreset} walkthroughMode={walkthroughMode} />
      <OrbitControls makeDefault enablePan enableRotate enableZoom enableDamping dampingFactor={0.05} minDistance={2} maxDistance={60} maxPolarAngle={walkthroughMode ? Math.PI : Math.PI / 2.05} />
    </>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function Building3DViewer({
  rooms, doors = [], windows = [], floorHeight = 3.0, scaleFactor = 0.015,
  onRoomClick, onWallClick, selectedRoomId = null, selectedWallKey = null,
}: Building3DViewerProps) {
  const [showLabels, setShowLabels] = useState(true)
  const [showWalls, setShowWalls] = useState(true)
  const [showDoors, setShowDoors] = useState(true)
  const [showWindows, setShowWindows] = useState(true)
  const [walkthroughMode, setWalkthroughMode] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<'perspective'|'top'|'front'|'side'|'walkthrough'>('perspective')
  const wallThickness = 0.23

  const handleRoomClick = useCallback((id: string) => onRoomClick?.(id), [onRoomClick])

  if (!rooms || rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[#F8F8FA] dark:bg-[#18181C] h-[600px] flex flex-col items-center justify-center">
        <Box className="w-12 h-12 text-black/10 dark:text-white/10 mb-3" />
        <p className="text-[14px] font-bold text-black/30 dark:text-white/20">No 3D Data Available</p>
        <p className="text-[12px] text-black/20 dark:text-white/15 mt-1">Run the floor plan analysis to generate the 3D model</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-[#0A0A0F]">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#1E1E24]/90 backdrop-blur-md border border-white/[0.06] shadow-lg">
        <div className="flex border-r border-white/[0.08] pr-1.5 mr-0.5 gap-0.5">
          {(['perspective','top','front','side'] as const).map(preset => (
            <button key={preset} onClick={() => { setCameraPreset(preset); setWalkthroughMode(false) }}
              className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all ${cameraPreset === preset && !walkthroughMode ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`}>
              {preset.toUpperCase().slice(0, 4)}
            </button>
          ))}
        </div>
        <button onClick={() => { setWalkthroughMode(!walkthroughMode); setCameraPreset('walkthrough') }}
          className={`p-2 rounded-lg transition-all ${walkthroughMode ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Walkthrough Mode">
          <Footprints className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
        <button onClick={() => setShowWalls(!showWalls)} className={`p-2 rounded-lg transition-all ${showWalls ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Toggle Walls"><Box className="w-4 h-4" /></button>
        <button onClick={() => setShowLabels(!showLabels)} className={`p-2 rounded-lg transition-all ${showLabels ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Toggle Labels">{showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
        <button onClick={() => setShowDoors(!showDoors)} className={`p-2 rounded-lg transition-all ${showDoors ? 'bg-gray-400/20 text-gray-300' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Toggle Doors"><DoorOpen className="w-4 h-4" /></button>
        <button onClick={() => setShowWindows(!showWindows)} className={`p-2 rounded-lg transition-all ${showWindows ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Toggle Windows"><AppWindow className="w-4 h-4" /></button>
      </div>

      {/* Room legend */}
      <div className="absolute top-3 left-3 z-20 p-2.5 rounded-xl bg-[#1E1E24]/90 backdrop-blur-md border border-white/[0.06] shadow-lg max-h-[220px] overflow-y-auto">
        <p className="text-[10px] font-bold text-white/30 mb-1.5 uppercase tracking-wider">Rooms</p>
        {rooms.map(room => (
          <div key={room.id}
            className={`flex items-center gap-2 py-0.5 px-1.5 rounded-lg cursor-pointer transition-all text-[11px] ${selectedRoomId === room.id ? 'bg-violet-500/20 text-violet-300' : 'text-white/50 hover:text-white/80'}`}
            onClick={() => handleRoomClick(room.id)}>
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: getRoomColor(room.label) }} />
            <span className="truncate">{room.label}</span>
            <span className="ml-auto text-[10px] text-white/30">{room.area_m2?.toFixed(1)}m²</span>
          </div>
        ))}
        {doors.length > 0 && <p className="text-[10px] text-white/20 mt-2 border-t border-white/[0.06] pt-1.5">{doors.length} doors · {windows.length} windows</p>}
      </div>

      {/* Walkthrough hint */}
      {walkthroughMode && (
        <div className="absolute top-14 right-3 z-20 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold">
          Walkthrough — double-click room to enter
        </div>
      )}

      <div className="h-[600px]">
        <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
          <PerspectiveCamera makeDefault position={[14, 11, 14]} fov={50} />
          <Scene
            rooms={rooms} doors={doors} windows={windows}
            floorHeight={floorHeight} scaleFactor={scaleFactor}
            selectedRoomId={selectedRoomId} selectedWallKey={selectedWallKey}
            showWalls={showWalls} showLabels={showLabels}
            showDoors={showDoors} showWindows={showWindows}
            cameraPreset={cameraPreset} walkthroughMode={walkthroughMode}
            wallThickness={wallThickness}
            onRoomClick={handleRoomClick}
            onWallClick={(roomId, wallIdx, len, thick) => onWallClick?.({ roomId, wallIndex: wallIdx, length: len, thickness: thick })}
          />
        </Canvas>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-[#1E1E24]/80 backdrop-blur-md border border-white/[0.06] text-[10px] text-white/30">
        Drag to orbit · Scroll to zoom · Double-click room to fly inside · Click wall to inspect
      </div>
    </div>
  )
}
