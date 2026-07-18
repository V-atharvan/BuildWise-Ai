'use client'

import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Grid, Environment, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface Room3DData {
  id: string
  label: string
  length: number  // meters
  width: number   // meters
  height: number  // meters (floor-to-ceiling)
  wallThickness: number // meters
  doors: { position: 'front' | 'back' | 'left' | 'right'; width: number; height: number }[]
  windows: { position: 'front' | 'back' | 'left' | 'right'; width: number; height: number; sillHeight: number }[]
  floorColor?: string
  wallColor?: string
  ceilingColor?: string
}

interface Room3DViewerProps {
  room: Room3DData
  showDimensions?: boolean
  showWireframe?: boolean
  viewMode?: 'solid' | 'wireframe' | 'textured'
}

// ══════════════════════════════════════════════════════════════════════════════
// Wall Component
// ══════════════════════════════════════════════════════════════════════════════

function Wall({
  position, size, color, openings = [],
}: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  openings?: { x: number; y: number; w: number; h: number }[]
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-size[0] / 2, -size[1] / 2)
    shape.lineTo(size[0] / 2, -size[1] / 2)
    shape.lineTo(size[0] / 2, size[1] / 2)
    shape.lineTo(-size[0] / 2, size[1] / 2)
    shape.lineTo(-size[0] / 2, -size[1] / 2)

    // Create openings (doors/windows)
    openings.forEach(op => {
      const hole = new THREE.Path()
      hole.moveTo(op.x - op.w / 2, op.y - op.h / 2)
      hole.lineTo(op.x + op.w / 2, op.y - op.h / 2)
      hole.lineTo(op.x + op.w / 2, op.y + op.h / 2)
      hole.lineTo(op.x - op.w / 2, op.y + op.h / 2)
      hole.lineTo(op.x - op.w / 2, op.y - op.h / 2)
      shape.holes.push(hole)
    })

    const extrudeSettings = { depth: size[2], bevelEnabled: false }
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [size, openings])

  return (
    <mesh position={position} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Room3D Component
// ══════════════════════════════════════════════════════════════════════════════

function Room3D({ room, showDimensions }: { room: Room3DData; showDimensions: boolean }) {
  const { length: L, width: W, height: H, wallThickness: T } = room
  const floorColor = room.floorColor || '#E8DCC8'
  const wallColor = room.wallColor || '#F5F0E8'
  const ceilingColor = room.ceilingColor || '#FAFAF8'

  // Calculate door openings for each wall
  const getOpenings = (wallSide: string) => {
    const ops: { x: number; y: number; w: number; h: number }[] = []
    room.doors.filter(d => d.position === wallSide).forEach(d => {
      ops.push({ x: 0, y: d.height / 2 - H / 2, w: d.width, h: d.height })
    })
    room.windows.filter(w => w.position === wallSide).forEach(w => {
      ops.push({ x: 0, y: w.sillHeight + w.height / 2 - H / 2, w: w.width, h: w.height })
    })
    return ops
  }

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={floorColor} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Ceiling (semi-transparent) */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={ceilingColor} transparent opacity={0.3} />
      </mesh>

      {/* Front Wall (positive Z) */}
      <mesh position={[0, H / 2, W / 2]} receiveShadow castShadow>
        <boxGeometry args={[L, H, T]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Back Wall (negative Z) */}
      <mesh position={[0, H / 2, -W / 2]} receiveShadow castShadow>
        <boxGeometry args={[L, H, T]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Left Wall (negative X) */}
      <mesh position={[-L / 2, H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Right Wall (positive X) */}
      <mesh position={[L / 2, H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Door openings rendered as colored planes */}
      {room.doors.map((door, i) => {
        let pos: [number, number, number] = [0, door.height / 2, 0]
        if (door.position === 'front') pos = [0, door.height / 2, W / 2 + T / 2 + 0.01]
        if (door.position === 'back') pos = [0, door.height / 2, -W / 2 - T / 2 - 0.01]
        if (door.position === 'left') pos = [-L / 2 - T / 2 - 0.01, door.height / 2, 0]
        if (door.position === 'right') pos = [L / 2 + T / 2 + 0.01, door.height / 2, 0]
        const rot: [number, number, number] = (door.position === 'left' || door.position === 'right')
          ? [0, Math.PI / 2, 0] : [0, 0, 0]
        return (
          <mesh key={`door-${i}`} position={pos} rotation={rot}>
            <planeGeometry args={[door.width, door.height]} />
            <meshStandardMaterial color="#8B6F47" roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        )
      })}

      {/* Window openings */}
      {room.windows.map((win, i) => {
        let pos: [number, number, number] = [0, win.sillHeight + win.height / 2, 0]
        if (win.position === 'front') pos = [0, win.sillHeight + win.height / 2, W / 2 + T / 2 + 0.01]
        if (win.position === 'back') pos = [0, win.sillHeight + win.height / 2, -W / 2 - T / 2 - 0.01]
        if (win.position === 'left') pos = [-L / 2 - T / 2 - 0.01, win.sillHeight + win.height / 2, 0]
        if (win.position === 'right') pos = [L / 2 + T / 2 + 0.01, win.sillHeight + win.height / 2, 0]
        const rot: [number, number, number] = (win.position === 'left' || win.position === 'right')
          ? [0, Math.PI / 2, 0] : [0, 0, 0]
        return (
          <mesh key={`win-${i}`} position={pos} rotation={rot}>
            <planeGeometry args={[win.width, win.height]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        )
      })}

      {/* Dimension Labels */}
      {showDimensions && (
        <>
          {/* Length label */}
          <Text position={[0, -0.3, W / 2 + 0.5]} fontSize={0.25} color="#7C3AED" anchorX="center">
            {L.toFixed(1)} m
          </Text>
          {/* Width label */}
          <Text position={[L / 2 + 0.5, -0.3, 0]} fontSize={0.25} color="#7C3AED" anchorX="center" rotation={[0, -Math.PI / 2, 0]}>
            {W.toFixed(1)} m
          </Text>
          {/* Height label */}
          <Text position={[-L / 2 - 0.5, H / 2, -W / 2]} fontSize={0.2} color="#7C3AED" anchorX="center" rotation={[0, Math.PI / 4, 0]}>
            {H.toFixed(1)} m
          </Text>
          {/* Room name */}
          <Text position={[0, H + 0.3, 0]} fontSize={0.3} color="#7C3AED" anchorX="center" fontWeight="bold">
            {room.label}
          </Text>
        </>
      )}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Viewer
// ══════════════════════════════════════════════════════════════════════════════

export function Room3DViewer({ room, showDimensions = true, showWireframe = false }: Room3DViewerProps) {
  const maxDim = Math.max(room.length, room.width, room.height)
  const camDist = maxDim * 2

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#18181C] dark:to-[#1E1E24]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[camDist, camDist * 0.6, camDist]} fov={50} />
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={2}
          maxDistance={50}
          target={[0, room.height / 2, 0]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-5, 10, -5]} intensity={0.3} />

        {/* Environment */}
        <Environment preset="apartment" />

        {/* Grid */}
        <Grid
          args={[20, 20]}
          position={[0, -0.01, 0]}
          cellSize={1}
          cellColor="#E0E0E0"
          sectionSize={5}
          sectionColor="#C0C0C0"
          fadeDistance={30}
          fadeStrength={1}
        />

        {/* Room */}
        <Room3D room={room} showDimensions={showDimensions} />
      </Canvas>
    </div>
  )
}
