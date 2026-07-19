'use client'

import { useState } from 'react'
import {
  AlertTriangle, CheckCircle, HelpCircle, RefreshCw, Trash2, Merge, Check, Edit3, X,
  Settings, ShieldAlert, Award
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
  
  // Extended props
  drawingClassification?: {
    drawing_type: string
    confidence: number
    is_architectural_floor_plan: boolean
    warning_message?: string
  }
  imageQuality?: {
    score: number
    problems: string[]
    recommendations: string[]
    brightness: number
    contrast: number
    blur_index: number
  }
  geometryValidation?: {
    is_valid: boolean
    issues: {
      type: string
      severity: string
      element_ids: string[]
      description: string
    }[]
  }
  floorHeight: number
  wallThickness: number
  pxPerMeter: number
  onFloorHeightChange?: (h: number) => void
  onWallThicknessChange?: (t: number) => void
  onPxPerMeterChange?: (p: number) => void
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
  isProcessing = false,
  drawingClassification,
  imageQuality,
  geometryValidation,
  floorHeight,
  wallThickness,
  pxPerMeter,
  onFloorHeightChange,
  onWallThicknessChange,
  onPxPerMeterChange
}: RoomCorrectionPanelProps) {
  const [activeTab, setActiveTab] = useState<'detections' | 'global' | 'validation'>('detections')
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

      {/* Tabs */}
      <div className="flex border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01]">
        {(['detections', 'global', 'validation'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-grow py-2 text-[11px] font-bold border-b-2 transition-all capitalize ${
              activeTab === tab
                ? 'border-violet-500 text-violet-500 bg-white dark:bg-[#1E1E24]'
                : 'border-transparent text-black/40 dark:text-white/30 hover:text-black/60 dark:hover:text-white/50'
            }`}
          >
            {tab === 'detections' ? 'Detections' : tab === 'global' ? 'Settings' : 'Alerts'}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {activeTab === 'detections' && (
          <div className="space-y-4 animate-fadeIn">
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

                {/* Operations */}
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
              </div>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-center py-6">
                <HelpCircle className="w-8 h-8 text-black/20 dark:text-white/15 mb-2" />
                <p className="text-[13px] font-bold text-black/40 dark:text-white/30">Select a Room</p>
                <p className="text-[11px] text-black/25 dark:text-white/15 max-w-[200px] mt-1">
                  Click on a room polygon in the floor plan to correct or merge detections
                </p>
              </div>
            )}

            {/* Room List */}
            <div className="space-y-2 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
              <p className="text-[11px] font-bold text-black/40 dark:text-white/30 uppercase tracking-wider mb-2">
                Rooms List ({rooms.length})
              </p>
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
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
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <div>
                          <p className="text-[12.5px] font-bold text-black/80 dark:text-white/90">{room.label}</p>
                          <p className="text-[10px] text-black/35 dark:text-white/25">{room.area_m2?.toFixed(1)} m²</p>
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
        )}

        {activeTab === 'global' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Global Parameters Editor */}
            <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] space-y-3.5">
              <div className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-violet-500" />
                <h4 className="text-[13px] font-black text-black/80 dark:text-white/90">Global Plan Constants</h4>
              </div>
              <p className="text-[10.5px] text-black/40 dark:text-white/35">Adjusting these parameters will immediately recalculate estimated materials and geometry bounds.</p>
              
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10.5px] font-bold text-black/50 dark:text-white/40 block mb-1">Default Floor Height (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="2"
                    max="6"
                    value={floorHeight}
                    onChange={e => onFloorHeightChange?.(parseFloat(e.target.value) || 3.0)}
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-transparent text-[13px] focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-black/50 dark:text-white/40 block mb-1">Nominal Wall Thickness (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="0.5"
                    value={wallThickness}
                    onChange={e => onWallThicknessChange?.(parseFloat(e.target.value) || 0.23)}
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-transparent text-[13px] focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-black/50 dark:text-white/40 block mb-1">Scale Ratio (pixels per meter)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="1000"
                    value={pxPerMeter}
                    onChange={e => onPxPerMeterChange?.(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-transparent text-[13px] focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Image quality details */}
            {imageQuality && (
              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[13px] font-black text-black/80 dark:text-white/90">Image Quality Check</h4>
                  </div>
                  <span className="text-[11.5px] font-black" style={{ color: imageQuality.score >= 80 ? '#10B981' : '#F59E0B' }}>
                    {imageQuality.score}% Score
                  </span>
                </div>
                
                {imageQuality.problems.length > 0 ? (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Problems Detected</p>
                    {imageQuality.problems.map((prob: string, idx: number) => (
                      <p key={idx} className="text-[11px] text-black/60 dark:text-white/50 flex items-start gap-1">
                        <span className="text-red-500">•</span> {prob}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/5 p-2 rounded-lg">✓ Perfect drawing resolution and brightness.</p>
                )}

                {imageQuality.recommendations.length > 0 && (
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Recommendations</p>
                    {imageQuality.recommendations.map((rec: string, idx: number) => (
                      <p key={idx} className="text-[11.5px] text-black/50 dark:text-white/40 leading-relaxed italic">
                        {rec}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Drawing Classification Alert */}
            {drawingClassification && (
              <div className={`p-4 rounded-2xl border ${
                drawingClassification.is_architectural_floor_plan 
                  ? 'border-emerald-500/10 bg-emerald-500/[0.01]' 
                  : 'border-amber-500/20 bg-amber-500/[0.02]'
              } space-y-2`}>
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className={`w-4 h-4 ${
                    drawingClassification.is_architectural_floor_plan ? 'text-emerald-500' : 'text-amber-500 animate-pulse'
                  }`} />
                  <h4 className="text-[13px] font-black text-black/80 dark:text-white/90">Drawing Classification</h4>
                </div>
                <div className="text-[11.5px] text-black/60 dark:text-white/55 space-y-1">
                  <p>Detected Layout: <span className="font-bold text-violet-500 capitalize">{drawingClassification.drawing_type?.replace('_', ' ')}</span></p>
                  <p>AI Confidence: <span className="font-bold">{Math.round(drawingClassification.confidence * 100)}%</span></p>
                  
                  {!drawingClassification.is_architectural_floor_plan && (
                    <p className="text-amber-600 dark:text-amber-400 font-bold text-[10.5px] bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 mt-2 leading-relaxed">
                      ⚠️ WARNING: {drawingClassification.warning_message || 'This drawing does not appear to be an architectural floor plan. Wall estimation metrics may be inaccurate.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Validation Issues Checklist */}
            <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] space-y-3">
              <h4 className="text-[13px] font-black text-black/80 dark:text-white/90">Geometry Validation Alerts</h4>
              
              {geometryValidation && geometryValidation.issues && geometryValidation.issues.length > 0 ? (
                <div className="space-y-2">
                  {geometryValidation.issues.map((issue: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-red-500/[0.02] border border-red-500/10 hover:bg-red-500/[0.04] transition-all cursor-pointer"
                      onClick={() => {
                        if (issue.element_ids && issue.element_ids.length > 0) {
                          onRoomSelect(issue.element_ids[0])
                          setActiveTab('detections')
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-red-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{issue.type?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-[11.5px] text-black/60 dark:text-white/55 mt-1 leading-relaxed">{issue.description}</p>
                      {issue.element_ids && issue.element_ids.length > 0 && (
                        <p className="text-[10px] text-violet-500 font-semibold mt-1.5">View troubled room →</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-black/30 dark:text-white/20 space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-[12px] font-bold text-emerald-600">All geometry checks passed!</p>
                  <p className="text-[10.5px] max-w-[190px] mx-auto">No overlapping boundaries, unclosed polygons, or duplicate rooms detected.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
