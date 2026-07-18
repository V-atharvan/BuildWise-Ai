'use client'

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text, Grid, Environment, PerspectiveCamera, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, EyeOff, Box, Layers, RotateCcw, SunMedium, CameraIcon, Compass, Maximize2 } from 'lucide-react'

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

interface Room3D {
  id: string
  label: string
  polygon: number[][]       // [[x,y], ...] in meters (real-world coords)
  area_m2: number
  perimeter_m: number
  classification?: {
    confidence: { overall: number }
  }
}

interface Door3D {
  center: number[]          // [x, y] in pixels (to be scaled)
  width_m: number
  room_id?: string
}

interface Window3D {
  center: number[]
  width_m: number
  room_id?: string
}

interface Building3DViewerProps {
  rooms: Room3D[]
  doors?: Door3D[]
  windows?: Window3D[]
  floorHeight?: number      // meters
  scaleFactor?: number      // m per px (for converting pixel positions)
  onRoomClick?: (roomId: string) => void
  onWallClick?: (wall: { roomId: string; wallIndex: number; length: number; thickness: number }) => void
  selectedRoomId?: string | null
  selectedWallKey?: string | null
}

// ══════════════════════════════════════════════════════════════════════════════
// Room Colors (matching floor plan viewer)
// ══════════════════════════════════════════════════════════════════════════════

const ROOM_3D_COLORS: Record<string, string> = {
  bedroom: '#8B5CF6',
  master_bedroom: '#7C3AED',
  living_room: '#10B981',
  kitchen: '#F59E0B',
  bathroom: '#3B82F6',
  toilet: '#6366F1',
  dining_room: '#EC4899',
  balcony: '#22C55E',
  passage: '#9CA3AF',
  staircase: '#A855F7',
  store_room: '#6B7280',
  utility: '#4B5563',
  pooja_room: '#FB923C',
  study: '#0EA5E9',
}

function getRoomColor(label: string): string {
  const key = label.toLowerCase().replace(/\s+/g, '_').replace(/\d+/g, '').replace(/_+$/, '')
  return ROOM_3D_COLORS[key] || '#7C3AED'
}

// ══════════════════════════════════════════════════════════════════════════════
// Room Mesh Component
// ══════════════════════════════════════════════════════════════════════════════

function RoomMesh({
  room,
  floorHeight,
  isSelected,
  isHovered,
  showWalls,
  showLabels,
  selectedWallKey,
  onHover,
  onClick,
  onDoubleClick,
  onWallClick,
}: {
  room: Room3D
  floorHeight: number
  isSelected: boolean
  isHovered: boolean
  showWalls: boolean
  showLabels: boolean
  selectedWallKey: string | null
  onHover: (hovered: boolean) => void
  onClick: () => void
  onDoubleClick: () => void
  onWallClick?: (roomId: string, wallIndex: number, length: number, thickness: number) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wallsRef = useRef<THREE.Group>(null)
  const color = getRoomColor(room.label)
  const poly = room.polygon

  if (!poly || poly.length < 3) return null

  // Calculate centroid for label placement
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length

  // Create floor shape from polygon
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(poly[0][0], poly[0][1])
    for (let i = 1; i < poly.length; i++) {
      s.lineTo(poly[i][0], poly[i][1])
    }
    s.closePath()
    return s
  }, [poly])

  // Wall segments
  const wallSegments = useMemo(() => {
    const segments = []
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]
      const p2 = poly[(i + 1) % poly.length]
      segments.push({ start: p1, end: p2 })
    }
    return segments
  }, [poly])

  const opacity = isSelected ? 0.55 : isHovered ? 0.45 : 0.30

  return (
    <group>
      {/* Floor */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick() }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
        onPointerLeave={() => onHover(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorHeight, 0]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#FAFAFA" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* Walls */}
      {showWalls && (
        <group ref={wallsRef}>
          {wallSegments.map((seg, i) => {
            const dx = seg.end[0] - seg.start[0]
            const dy = seg.end[1] - seg.start[1]
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx)
            const midX = (seg.start[0] + seg.end[0]) / 2
            const midY = (seg.start[1] + seg.end[1]) / 2
            const wallThickness = room.id === 'r4' ? 0.15 : 0.23 // thicker external / main internal walls
            const wallKey = `${room.id}-${i}`
            const isWallSelected = selectedWallKey === wallKey

            return (
              <mesh
                key={i}
                position={[midX, floorHeight / 2, -midY]}
                rotation={[0, -angle, 0]}
                onClick={(e) => { e.stopPropagation(); onWallClick?.(room.id, i, length, wallThickness) }}
              >
                <boxGeometry args={[length, floorHeight, wallThickness]} />
                <meshStandardMaterial
                  color={isWallSelected ? '#A855F7' : isSelected ? '#C084FC' : '#E0E0E0'}
                  transparent
                  opacity={isWallSelected ? 0.9 : isSelected ? 0.75 : 0.55}
                />
                {isWallSelected && (
                  <Html position={[0, floorHeight * 0.6, 0]} center distanceFactor={8}>
                    <div className="bg-[#1E1E24]/95 text-white border border-white/[0.08] p-3 rounded-2xl shadow-xl whitespace-nowrap text-[11px] font-semibold space-y-1 backdrop-blur-md z-30">
                      <p className="text-violet-400 font-bold border-b border-white/[0.06] pb-1 uppercase tracking-wider text-[9px]">Selected Wall Segment</p>
                      <p>📏 Length: <span className="font-bold text-violet-300">{length.toFixed(2)} m</span></p>
                      <p>📐 Thickness: <span className="font-bold text-violet-300">{(wallThickness * 1000).toFixed(0)} mm</span></p>
                      <p>🧱 Volume: <span className="font-bold text-violet-300">{(length * floorHeight * wallThickness).toFixed(2)} m³</span></p>
                      <p>👷 Bricks: <span className="font-bold text-emerald-400">{Math.round(length * floorHeight * wallThickness * 500).toLocaleString()} pcs</span></p>
                    </div>
                  </Html>
                )}
              </mesh>
            )
          })}
        </group>
      )}

      {/* Room Label */}
      {showLabels && (
        <>
          <Text
            position={[cx, floorHeight * 0.6, -cy]}
            fontSize={0.5}
            color={color}
            fontWeight={700}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#FFFFFF"
          >
            {room.label}
          </Text>

          {/* Area label below room name */}
          <Text
            position={[cx, floorHeight * 0.4, -cy]}
            fontSize={0.3}
            color="#666666"
            anchorX="center"
            anchorY="middle"
          >
            {room.area_m2?.toFixed(1)} m²
          </Text>
        </>
      )}

      {/* Selection outline on floor */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color="#7C3AED" transparent opacity={0.3} side={THREE.DoubleSide} wireframe />
        </mesh>
      )}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Camera Tweener (handles camera animations & preset snaps)
// ══════════════════════════════════════════════════════════════════════════════

function CameraTweener({ target, preset }: { target: THREE.Vector3 | null; preset: string }) {
  const { camera, controls } = useThree()

  useEffect(() => {
    if (!controls) return
    const ctrl = controls as any
    if (preset === 'top') {
      ctrl.target.set(0, 0, 0)
      camera.position.set(0, 22, 0.001)
      ctrl.update()
    } else if (preset === 'front') {
      ctrl.target.set(0, 0, 0)
      camera.position.set(0, 2, 18)
      ctrl.update()
    } else if (preset === 'side') {
      ctrl.target.set(0, 0, 0)
      camera.position.set(18, 2, 0)
      ctrl.update()
    } else if (preset === 'perspective') {
      ctrl.target.set(0, 0, 0)
      camera.position.set(15, 12, 15)
      ctrl.update()
    }
  }, [preset, camera, controls])

  useFrame(() => {
    // Smoothly fly inside room centroid if look-at target is present
    if (target && controls && preset === 'perspective') {
      const ctrl = controls as any
      ctrl.target.lerp(target, 0.06)
      const destPos = new THREE.Vector3(target.x, target.y + 7, target.z + 7)
      camera.position.lerp(destPos, 0.06)
      ctrl.update()
    }
  })

  return null
}

// ══════════════════════════════════════════════════════════════════════════════
// Scene
// ══════════════════════════════════════════════════════════════════════════════

function Scene({
  rooms,
  floorHeight,
  scaleFactor,
  selectedRoomId,
  selectedWallKey,
  showWalls,
  showLabels,
  cameraPreset,
  onRoomClick,
  onWallClick,
}: {
  rooms: Room3D[]
  floorHeight: number
  scaleFactor: number
  selectedRoomId: string | null
  selectedWallKey: string | null
  showWalls: boolean
  showLabels: boolean
  cameraPreset: string
  onRoomClick: (id: string) => void
  onWallClick?: (roomId: string, wallIndex: number, length: number, thickness: number) => void
}) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null)

  // Scale and center rooms
  const transformedRooms = useMemo(() => {
    // Find bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rooms.forEach(room => {
      room.polygon?.forEach(([x, y]) => {
        const sx = x * scaleFactor
        const sy = y * scaleFactor
        minX = Math.min(minX, sx)
        minY = Math.min(minY, sy)
        maxX = Math.max(maxX, sx)
        maxY = Math.max(maxY, sy)
      })
    })

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    return rooms.map(room => ({
      ...room,
      polygon: room.polygon?.map(([x, y]) => [
        x * scaleFactor - centerX,
        y * scaleFactor - centerY,
      ]) || [],
    }))
  }, [rooms, scaleFactor])

  const handleRoomDoubleClick = (room: any) => {
    const poly = room.polygon
    if (poly && poly.length > 0) {
      const cx = poly.reduce((s: number, p: number[]) => s + p[0], 0) / poly.length
      const cy = poly.reduce((s: number, p: number[]) => s + p[1], 0) / poly.length
      setCameraTarget(new THREE.Vector3(cx, 0, -cy))
    }
  }

  // Clear camera target when selectedRoomId changes to null
  useEffect(() => {
    if (!selectedRoomId) {
      setCameraTarget(null)
    } else {
      const room = transformedRooms.find(r => r.id === selectedRoomId)
      if (room) {
        handleRoomDoubleClick(room)
      }
    }
  }, [selectedRoomId, transformedRooms])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 15, -10]} intensity={0.3} />

      {/* Ground grid */}
      <Grid
        args={[40, 40]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#E5E7EB"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#D1D5DB"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Room meshes */}
      {transformedRooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          floorHeight={floorHeight}
          isSelected={selectedRoomId === room.id}
          isHovered={hoveredRoom === room.id}
          showWalls={showWalls}
          showLabels={showLabels}
          selectedWallKey={selectedWallKey}
          onHover={(h) => setHoveredRoom(h ? room.id : null)}
          onClick={() => onRoomClick(room.id)}
          onDoubleClick={() => handleRoomDoubleClick(room)}
          onWallClick={onWallClick}
        />
      ))}

      {/* Tweener Component */}
      <CameraTweener target={cameraTarget} preset={cameraPreset} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableRotate
        enableZoom
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

export function Building3DViewer({
  rooms,
  doors = [],
  windows = [],
  floorHeight = 3.0,
  scaleFactor = 0.015,
  onRoomClick,
  onWallClick,
  selectedRoomId = null,
  selectedWallKey = null,
}: Building3DViewerProps) {
  const [showLabels, setShowLabels] = useState(true)
  const [showWalls, setShowWalls] = useState(true)
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'top' | 'front' | 'side'>('perspective')

  const handleRoomClick = useCallback((id: string) => {
    onRoomClick?.(id)
  }, [onRoomClick])

  if (!rooms || rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[#F8F8FA] dark:bg-[#18181C] h-[600px] flex flex-col items-center justify-center">
        <Box className="w-12 h-12 text-black/10 dark:text-white/10 mb-3" />
        <p className="text-[14px] font-bold text-black/30 dark:text-white/20">No 3D Data Available</p>
        <p className="text-[12px] text-black/20 dark:text-white/15">Run the floor plan analysis to generate the 3D model</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-[#0A0A0F]">
      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#1E1E24]/90 backdrop-blur-md border border-white/[0.06] shadow-lg">
        {/* Orthographic presets */}
        <div className="flex border-r border-white/[0.08] pr-1.5 mr-0.5">
          <button
            onClick={() => setCameraPreset('perspective')}
            className={`p-2 rounded-lg text-[10.5px] font-bold transition-all ${cameraPreset === 'perspective' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`}
            title="3D Perspective"
          >
            3D
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`p-2 rounded-lg text-[10.5px] font-bold transition-all ${cameraPreset === 'top' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`}
            title="Top View (Plan)"
          >
            TOP
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`p-2 rounded-lg text-[10.5px] font-bold transition-all ${cameraPreset === 'front' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`}
            title="Front Elevation"
          >
            FRONT
          </button>
          <button
            onClick={() => setCameraPreset('side')}
            className={`p-2 rounded-lg text-[10.5px] font-bold transition-all ${cameraPreset === 'side' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`}
            title="Side Elevation"
          >
            SIDE
          </button>
        </div>

        {/* Toggles */}
        <button onClick={() => setShowWalls(!showWalls)} className={`p-2 rounded-lg transition-all ${showWalls ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Toggle Walls">
          <Box className="w-4 h-4" />
        </button>
        <button onClick={() => setShowLabels(!showLabels)} className={`p-2 rounded-lg transition-all ${showLabels ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:bg-white/[0.05]'}`} title="Toggle Labels">
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Room Legend ─────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-20 p-2.5 rounded-xl bg-[#1E1E24]/90 backdrop-blur-md border border-white/[0.06] shadow-lg max-h-[200px] overflow-y-auto">
        <p className="text-[10px] font-bold text-white/30 mb-1.5 uppercase tracking-wider">Rooms</p>
        {rooms.map(room => (
          <div
            key={room.id}
            className={`flex items-center gap-2 py-0.5 px-1 rounded cursor-pointer transition-all text-[11px] ${selectedRoomId === room.id ? 'bg-violet-500/20 text-violet-300' : 'text-white/50 hover:text-white/80'}`}
            onClick={() => handleRoomClick(room.id)}
          >
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: getRoomColor(room.label) }} />
            <span className="truncate">{room.label}</span>
            <span className="ml-auto text-[10px] text-white/30">{room.area_m2?.toFixed(1)}m²</span>
          </div>
        ))}
      </div>

      {/* ── 3D Canvas ──────────────────────────────────────────────── */}
      <div className="h-[600px]">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
          <Scene
            rooms={rooms}
            floorHeight={floorHeight}
            scaleFactor={scaleFactor}
            selectedRoomId={selectedRoomId}
            selectedWallKey={selectedWallKey}
            showWalls={showWalls}
            showLabels={showLabels}
            cameraPreset={cameraPreset}
            onRoomClick={handleRoomClick}
            onWallClick={(roomId, wallIdx, len, thick) => onWallClick?.({ roomId, wallIndex: wallIdx, length: len, thickness: thick })}
          />
        </Canvas>
      </div>

      {/* ── Controls Hint ──────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-[#1E1E24]/80 backdrop-blur-md border border-white/[0.06] text-[10px] text-white/30">
        Drag to orbit · Scroll to zoom · Double-click room to fly inside · Click a wall to inspect
      </div>
    </div>
  )
}
