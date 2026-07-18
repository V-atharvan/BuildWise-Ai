'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, Palette, Droplets, Zap, Wrench, MapPin,
  Save, RotateCcw, ChevronDown, CheckCircle2, Building
} from 'lucide-react'
import {
  BRICK_CATALOG, CEMENT_BRANDS, STEEL_BRAND_LIST, STEEL_GRADE_LIST,
  SAND_CATALOG, AGGREGATE_CATALOG, PAINT_BRAND_LIST, PAINT_TYPE_LIST,
  TILE_BRAND_LIST, TILE_TYPE_LIST, TILE_SIZE_LIST,
  PLUMBING_BRAND_LIST, ELECTRICAL_BRAND_LIST,
  AVAILABLE_REGIONS, STATE_LABELS, CONTRACTOR_CHARGE_OPTIONS,
  DEFAULT_MATERIAL_CONFIG, loadMaterialConfig, saveMaterialConfig,
  type MaterialConfig,
} from '@/lib/construction-data'

function SelectField({ label, value, onChange, options, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string; detail?: string }[];
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-black/45 dark:text-white/35 mb-1.5 uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5" />}{label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}{opt.detail ? ` — ${opt.detail}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

function PriceField({ label, value, onChange, unit }: {
  label: string; value: number; onChange: (v: number) => void; unit: string;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold text-black/45 dark:text-white/35 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-black/30 dark:text-white/20">₹</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full pl-7 pr-14 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-black/30 dark:text-white/20">{unit}</span>
      </div>
    </div>
  )
}

const SECTIONS = [
  { id: 'region', label: 'Region & Location', icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'masonry', label: 'Bricks & Blocks', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'structural', label: 'Cement, Steel & Aggregates', icon: Building, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { id: 'paint', label: 'Paint & Finishes', icon: Palette, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'tiles', label: 'Tiles & Flooring', icon: Package, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { id: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'electrical', label: 'Electrical', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'contractor', label: 'Contractor & Charges', icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
]

export default function ProjectMaterialConfigTab() {
  const { id: projectId } = useParams() as { id: string }
  const [config, setConfig] = useState<MaterialConfig>(DEFAULT_MATERIAL_CONFIG)
  const [saved, setSaved] = useState(false)
  const [openSection, setOpenSection] = useState<string>('region')

  useEffect(() => {
    if (projectId) {
      setConfig(loadMaterialConfig(projectId))
    }
  }, [projectId])

  const update = (key: keyof MaterialConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    saveMaterialConfig(config, projectId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setConfig(DEFAULT_MATERIAL_CONFIG)
    saveMaterialConfig(DEFAULT_MATERIAL_CONFIG, projectId)
  }

  const selectedBrick = BRICK_CATALOG.find(b => b.id === config.brick_brand_id) || BRICK_CATALOG[0]
  const selectedCement = CEMENT_BRANDS.find(c => c.id === config.cement_brand_id) || CEMENT_BRANDS[0]
  const selectedSteel = STEEL_BRAND_LIST.find(s => s.id === config.steel_brand_id) || STEEL_BRAND_LIST[0]
  const selectedSand = SAND_CATALOG.find(s => s.id === config.sand_type_id) || SAND_CATALOG[1]
  const selectedAggregate = AGGREGATE_CATALOG.find(a => a.id === config.aggregate_type_id) || AGGREGATE_CATALOG[1]

  const cities = AVAILABLE_REGIONS[config.region_state] || []

  return (
    <div className="max-w-[760px] mx-auto space-y-6 pt-4 pb-20">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-lg font-black tracking-tight">Project Material Configuration</h3>
        <p className="text-[13px] text-black/40 dark:text-white/35 mt-1">
          Customize materials, brand selections, and pricing specific to this project workspace.
        </p>
      </motion.div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.id
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[20px] overflow-hidden"
            >
              <button
                onClick={() => setOpenSection(isOpen ? '' : section.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all"
              >
                <div className={`w-9 h-9 rounded-xl ${section.bg} flex items-center justify-center`}>
                  <section.icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${section.color}`} />
                </div>
                <span className="flex-1 font-bold text-[14px]">{section.label}</span>
                <ChevronDown className={`w-4 h-4 text-black/30 dark:text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-5 pb-5 space-y-4 border-t border-black/[0.04] dark:border-white/[0.04] pt-4"
                >
                  {/* REGION */}
                  {section.id === 'region' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField
                        label="State"
                        value={config.region_state}
                        onChange={(v) => { update('region_state', v); update('region_city', '') }}
                        options={Object.entries(STATE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                        icon={MapPin}
                      />
                      <SelectField
                        label="City"
                        value={config.region_city}
                        onChange={(v) => update('region_city', v)}
                        options={[{ value: '', label: 'State Default' }, ...cities.map(c => ({ value: c.toLowerCase().replace(/ /g, '_'), label: c }))]}
                      />
                    </div>
                  )}

                  {/* MASONRY */}
                  {section.id === 'masonry' && (
                    <div className="space-y-4">
                      <SelectField
                        label="Brick / Block Type"
                        value={config.brick_brand_id}
                        onChange={(v) => update('brick_brand_id', v)}
                        options={BRICK_CATALOG.map(b => ({ value: b.id, label: b.name, detail: `₹${b.price_per_unit}/pc` }))}
                        icon={Package}
                      />
                      <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="text-center">
                          <p className="text-[11px] text-black/40 dark:text-white/30">Size</p>
                          <p className="text-[13px] font-bold">{selectedBrick.size_mm.length}×{selectedBrick.size_mm.width}×{selectedBrick.size_mm.height} mm</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] text-black/40 dark:text-white/30">Price</p>
                          <p className="text-[13px] font-bold text-violet-500">₹{selectedBrick.price_per_unit}/pc</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] text-black/40 dark:text-white/30">Per m³</p>
                          <p className="text-[13px] font-bold">{selectedBrick.units_per_m3} units</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STRUCTURAL */}
                  {section.id === 'structural' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField
                          label="Cement Brand"
                          value={config.cement_brand_id}
                          onChange={(v) => update('cement_brand_id', v)}
                          options={CEMENT_BRANDS.map(c => ({ value: c.id, label: c.name, detail: `₹${c.price_per_bag}/bag` }))}
                        />
                        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
                          <span className="text-[12px] text-black/40 dark:text-white/30">{selectedCement.grade} · 50 kg bag</span>
                          <span className="text-[14px] font-black text-violet-500">₹{selectedCement.price_per_bag}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField
                          label="Steel Brand"
                          value={config.steel_brand_id}
                          onChange={(v) => update('steel_brand_id', v)}
                          options={STEEL_BRAND_LIST.map(s => ({ value: s.id, label: s.name, detail: `₹${s.price_per_kg}/kg` }))}
                        />
                        <SelectField
                          label="Steel Grade"
                          value={config.steel_grade_id}
                          onChange={(v) => update('steel_grade_id', v)}
                          options={STEEL_GRADE_LIST.map(g => ({ value: g.id, label: g.name }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField
                          label="Sand Type"
                          value={config.sand_type_id}
                          onChange={(v) => update('sand_type_id', v)}
                          options={SAND_CATALOG.map(s => ({ value: s.id, label: s.name, detail: `₹${s.price_per_m3}/m³` }))}
                        />
                        <SelectField
                          label="Aggregate Type"
                          value={config.aggregate_type_id}
                          onChange={(v) => update('aggregate_type_id', v)}
                          options={AGGREGATE_CATALOG.map(a => ({ value: a.id, label: a.name, detail: `₹${a.price_per_m3}/m³` }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* PAINT */}
                  {section.id === 'paint' && (
                    <SelectField
                      label="Paint Brand"
                      value={config.paint_brand_id}
                      onChange={(v) => update('paint_brand_id', v)}
                      options={PAINT_BRAND_LIST.map(p => ({ value: p.id, label: p.name }))}
                      icon={Palette}
                    />
                  )}

                  {/* TILES */}
                  {section.id === 'tiles' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SelectField
                        label="Tile Brand"
                        value={config.tile_brand_id}
                        onChange={(v) => update('tile_brand_id', v)}
                        options={TILE_BRAND_LIST.map(t => ({ value: t.id, label: t.name }))}
                      />
                      <SelectField
                        label="Tile Type"
                        value={config.tile_type_id}
                        onChange={(v) => update('tile_type_id', v)}
                        options={TILE_TYPE_LIST.map(t => ({ value: t.id, label: t.name, detail: `₹${t.base_price_per_m2}/m²` }))}
                      />
                      <SelectField
                        label="Tile Size"
                        value={config.tile_size_id}
                        onChange={(v) => update('tile_size_id', v)}
                        options={TILE_SIZE_LIST.map(s => ({ value: s.id, label: s.name }))}
                      />
                    </div>
                  )}

                  {/* PLUMBING */}
                  {section.id === 'plumbing' && (
                    <SelectField
                      label="Plumbing Brand"
                      value={config.plumbing_brand_id}
                      onChange={(v) => update('plumbing_brand_id', v)}
                      options={PLUMBING_BRAND_LIST.map(p => ({ value: p.id, label: p.name }))}
                      icon={Droplets}
                    />
                  )}

                  {/* ELECTRICAL */}
                  {section.id === 'electrical' && (
                    <SelectField
                      label="Electrical Brand"
                      value={config.electrical_brand_id}
                      onChange={(v) => update('electrical_brand_id', v)}
                      options={ELECTRICAL_BRAND_LIST.map(e => ({ value: e.id, label: e.name }))}
                      icon={Zap}
                    />
                  )}

                  {/* CONTRACTOR */}
                  {section.id === 'contractor' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField
                        label="Charge Type"
                        value={config.contractor_charge_type}
                        onChange={(v) => update('contractor_charge_type', v)}
                        options={[
                          { value: 'percentage', label: 'Percentage Based' },
                          { value: 'fixed', label: 'Fixed Amount' },
                        ]}
                        icon={Wrench}
                      />
                      {config.contractor_charge_type === 'percentage' ? (
                        <SelectField
                          label="Contractor %"
                          value={String(config.contractor_charge_value)}
                          onChange={(v) => update('contractor_charge_value', parseFloat(v))}
                          options={CONTRACTOR_CHARGE_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
                        />
                      ) : (
                        <PriceField
                          label="Fixed Amount"
                          value={config.contractor_charge_value}
                          onChange={(v) => update('contractor_charge_value', v)}
                          unit="INR"
                        />
                      )}
                      <PriceField
                        label="GST Rate"
                        value={config.gst_pct}
                        onChange={(v) => update('gst_pct', v)}
                        unit="%"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-4">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all bg-white dark:bg-[#1E1E24]"
        >
          <RotateCcw className="w-4 h-4" /> Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/25"
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Configuration</>}
        </button>
      </div>
    </div>
  )
}
