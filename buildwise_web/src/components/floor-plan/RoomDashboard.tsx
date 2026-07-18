'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Ruler, Square, Layers, Package, Paintbrush, Grid3X3,
  Zap, Droplets, ArrowRight, Box
} from 'lucide-react'
import type { DetectedRoom } from './FloorPlanViewer'

interface RoomDashboardProps {
  room: DetectedRoom | null
  floorHeight: number
  wallThickness: number
  onClose: () => void
  onView3D?: (room: DetectedRoom) => void
}

export function RoomDashboard({ room, floorHeight, wallThickness, onClose, onView3D }: RoomDashboardProps) {
  if (!room) return null

  const wallArea = room.perimeter_m * floorHeight
  const wallVolume = wallArea * wallThickness * 0.9  // 10% openings
  const ceilingArea = room.area_m2
  const bricksNeeded = Math.ceil(wallVolume * 500 * 1.05) // 5% waste
  const cementBags = Math.ceil((wallVolume * 0.30 * 1.33 / 7) / 0.0347)
  const plasterArea = wallArea + ceilingArea
  const paintArea = plasterArea * 1.2
  const tileArea = room.area_m2

  const stats = [
    { label: 'Floor Area', value: `${room.area_m2.toFixed(1)} m²`, sub: `${room.area_sqft.toFixed(0)} sq ft`, icon: Square, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Dimensions', value: `${room.length_m.toFixed(1)} × ${room.width_m.toFixed(1)} m`, sub: 'Length × Width', icon: Ruler, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Wall Perimeter', value: `${room.perimeter_m.toFixed(1)} m`, sub: `Wall area: ${wallArea.toFixed(1)} m²`, icon: Layers, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Ceiling Area', value: `${ceilingArea.toFixed(1)} m²`, sub: `= Floor area`, icon: Square, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ]

  const materials = [
    { label: 'Bricks Required', value: bricksNeeded.toLocaleString(), unit: 'nos', icon: Package, color: 'text-amber-600' },
    { label: 'Cement Bags', value: cementBags, unit: 'bags', icon: Package, color: 'text-gray-600' },
    { label: 'Plaster Area', value: `${plasterArea.toFixed(1)}`, unit: 'm²', icon: Paintbrush, color: 'text-pink-500' },
    { label: 'Paint Area', value: `${paintArea.toFixed(1)}`, unit: 'm²', icon: Paintbrush, color: 'text-indigo-500' },
    { label: 'Floor Tiles', value: `${tileArea.toFixed(1)}`, unit: 'm²', icon: Grid3X3, color: 'text-teal-500' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-[380px] z-40 bg-white dark:bg-[#1E1E24] border-l border-black/[0.06] dark:border-white/[0.06] shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1E1E24] border-b border-black/[0.06] dark:border-white/[0.06] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-[16px] font-black">{room.label}</h3>
            <p className="text-[11px] text-black/40 dark:text-white/30 mt-0.5">Room Details & Material Estimate</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Room Dimensions */}
          <div className="space-y-2">
            <h4 className="text-[12px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider">Dimensions</h4>
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-6 h-6 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-3 h-3 ${stat.color}`} />
                    </div>
                    <span className="text-[10px] text-black/40 dark:text-white/30">{stat.label}</span>
                  </div>
                  <p className="text-[14px] font-black">{stat.value}</p>
                  <p className="text-[10px] text-black/30 dark:text-white/20">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Wall Details */}
          <div className="space-y-2">
            <h4 className="text-[12px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider">Wall Properties</h4>
            <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-black/50 dark:text-white/40">Wall Height</span>
                <span className="font-bold">{floorHeight} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50 dark:text-white/40">Wall Thickness</span>
                <span className="font-bold">{(wallThickness * 1000).toFixed(0)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50 dark:text-white/40">Total Wall Area</span>
                <span className="font-bold">{wallArea.toFixed(1)} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50 dark:text-white/40">Wall Volume</span>
                <span className="font-bold">{wallVolume.toFixed(2)} m³</span>
              </div>
            </div>
          </div>

          {/* Material Estimates */}
          <div className="space-y-2">
            <h4 className="text-[12px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider">Material Estimates</h4>
            <div className="space-y-1.5">
              {materials.map((m) => (
                <div key={m.label} className="flex items-center gap-3 p-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-500/20 transition-all">
                  <m.icon className={`w-4 h-4 ${m.color} flex-shrink-0`} />
                  <span className="flex-1 text-[12.5px] text-black/60 dark:text-white/50">{m.label}</span>
                  <span className="text-[13px] font-black">{m.value}</span>
                  <span className="text-[10px] text-black/30 dark:text-white/20">{m.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* View 3D Button */}
          {onView3D && (
            <button
              onClick={() => onView3D(room)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/25"
            >
              <Box className="w-4 h-4" /> View Room in 3D <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
