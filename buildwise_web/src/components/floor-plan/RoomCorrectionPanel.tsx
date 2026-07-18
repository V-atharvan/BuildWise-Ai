'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle, HelpCircle, RefreshCw, Trash2, Merge, Check, Edit3, X
} from 'lucide-react'
import type { DetectedRoom } from './FloorPlanViewer'

interface RoomCorrectionPanelProps {
  rooms: DetectedRoom[]
  selectedRoomId: string | null
  onRoomSelect: (roomId: string) => void
  onRename: (roomId: string, newLabel: string) => void
  onDelete: (roomId: string) => void
  onMerge: (roomIdA: string, roomIdB: string) => void
  isProcessing?: boolean
}

const PRESET_LABELS = [
  'Living Room', 'Master Bedroom', 'Bedroom', 'Kitchen', 'Dining Room',
  'Bathroom', 'Toilet', 'Passage', 'Balcony', 'Store Room', 'Utility',
  'Staircase'
]

export function RoomCorrectionPanel({
  rooms,
  selectedRoomId,
  onRoomSelect,
  onRename,
  onDelete,
  onMerge,
  isProcessing = false
}: RoomCorrectionPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)

  const selectedRoom = rooms.find(r => r.id === selectedRoomId)

  const handlePresetSelect = (label: string) => {
    if (selectedRoomId) {
      onRename(selectedRoomId, label)
      setEditingId(null)
    }
  }

  const handleCustomRename = () => {
    if (selectedRoomId && customName.trim()) {
      onRename(selectedRoomId, customName.trim())
      setCustomName('')
      setEditingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1E1E24] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[14px]">Confidence & Corrections</h3>
          <p className="text-[10px] text-black/40 dark:text-white/30">Verify and edit AI room detections</p>
        </div>
        {isProcessing && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-500" />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedRoom ? (
          <div className="space-y-4">
            {/* Selected Room Status */}
            <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-black/30 dark:text-white/20">Selected Room</p>
                  <h4 className="text-base font-black text-black/80 dark:text-white/90">{selectedRoom.label}</h4>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: selectedRoom.classification?.confidence?.overall && selectedRoom.classification.confidence.overall >= 0.80
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                    color: selectedRoom.classification?.confidence?.overall && selectedRoom.classification.confidence.overall >= 0.80
                      ? '#22C55E'
                      : '#F59E0B'
                  }}
                >
                  {selectedRoom.classification?.confidence?.overall
                    ? `${Math.round(selectedRoom.classification.confidence.overall * 100)}% Match`
                    : '100% Match (User)'
                  }
                </div>
              </div>

              {/* Confidence Explanation */}
              {selectedRoom.classification?.reason && (
                <p className="text-[11px] text-black/50 dark:text-white/40 leading-relaxed italic bg-violet-500/[0.03] p-2 rounded-lg border border-violet-500/5">
                  {selectedRoom.classification.reason}
                </p>
              )}
            </div>

            {/* Quick Actions (Rename / Delete / Merge) */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider">Correct Classification</p>

              {/* Preset Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_LABELS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-2 rounded-xl text-[11.5px] font-semibold border text-center transition-all ${
                      selectedRoom.label === preset
                        ? 'bg-violet-500/10 text-violet-500 border-violet-500/20'
                        : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom Rename input */}
              {editingId === selectedRoom.id ? (
                <div className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    placeholder="Enter custom room name..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="flex-1 px-3 py-2 text-[12px] bg-transparent rounded-xl border border-black/[0.1] dark:border-white/[0.1] focus:outline-none focus:ring-1 focus:ring-violet-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCustomRename() }}
                    autoFocus
                  />
                  <button onClick={handleCustomRename} className="p-2 rounded-xl bg-violet-500 text-white hover:bg-violet-600">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2 rounded-xl border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingId(selectedRoom.id); setCustomName(selectedRoom.label) }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-violet-500/30 text-violet-500 hover:bg-violet-500/[0.03] text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Custom Name...
                </button>
              )}
            </div>

            {/* Geometry stats & tools */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider">Room Operations</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (mergeSourceId) {
                      onMerge(mergeSourceId, selectedRoom.id)
                      setMergeSourceId(null)
                    } else {
                      setMergeSourceId(selectedRoom.id)
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl border text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                    mergeSourceId === selectedRoom.id
                      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                      : 'border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Merge className="w-3.5 h-3.5" />
                  {mergeSourceId === selectedRoom.id ? 'Click neighbor to merge' : 'Merge with...'}
                </button>
                <button
                  onClick={() => onDelete(selectedRoom.id)}
                  className="px-3.5 py-2.5 rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-all"
                  title="Delete False Detection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alternatives */}
            {selectedRoom.classification?.all_candidates && Object.keys(selectedRoom.classification.all_candidates).length > 1 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider">AI Alternatives</p>
                <div className="space-y-1.5">
                  {Object.entries(selectedRoom.classification.all_candidates)
                    .filter(([name]) => name !== selectedRoom.label)
                    .slice(0, 3)
                    .map(([name, conf]) => (
                      <button
                        key={name}
                        onClick={() => onRename(selectedRoom.id, name)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-left"
                      >
                        <span className="text-[12px] font-semibold text-black/70 dark:text-white/70">{name}</span>
                        <span className="text-[10px] text-black/40 dark:text-white/30">{Math.round(conf * 100)}%</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <HelpCircle className="w-8 h-8 text-black/20 dark:text-white/15 mb-2" />
            <p className="text-[13px] font-bold text-black/40 dark:text-white/30">Select a Room</p>
            <p className="text-[11px] text-black/25 dark:text-white/15 max-w-[200px] mt-1">
              Click on a room polygon in the floor plan to correct or merge detections
            </p>
          </div>
        )}

        {/* Room List & Confidence Flags */}
        <div className="space-y-2 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
          <p className="text-[11px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider mb-2">
            Low-Confidence Flags ({rooms.filter(r => r.classification?.low_confidence_flag).length})
          </p>
          <div className="space-y-1.5">
            {rooms.map((room) => {
              const confidence = room.classification?.confidence?.overall ?? 1.0
              const isLow = room.classification?.low_confidence_flag
              const isSelected = room.id === selectedRoomId

              return (
                <button
                  key={room.id}
                  onClick={() => onRoomSelect(room.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-violet-500/10 border-violet-500/20'
                      : isLow
                      ? 'bg-amber-500/[0.03] border-amber-500/10 hover:bg-amber-500/[0.06]'
                      : 'bg-black/[0.01] dark:bg-white/[0.01] border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isLow ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <div>
                      <p className="text-[12.5px] font-bold text-black/80 dark:text-white/90">{room.label}</p>
                      <p className="text-[10px] text-black/35 dark:text-white/25">{room.area_m2.toFixed(1)} m²</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: isLow ? '#F59E0B' : '#10B981' }}>
                    {Math.round(confidence * 100)}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
