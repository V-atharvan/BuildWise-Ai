/**
 * BuildWise AI — Construction Data Constants
 * ============================================
 * Complete TypeScript data catalogs for all construction materials,
 * brands, regional prices, and labour rates. Mirrors the Python
 * backend data for client-side demo mode and UI dropdowns.
 */

// ══════════════════════════════════════════════════════════════════════════════
// BRICK / BLOCK CATALOG
// ══════════════════════════════════════════════════════════════════════════════

export interface BrickEntry {
  id: string; name: string; type: string;
  size_mm: { length: number; width: number; height: number };
  units_per_m3: number; price_per_unit: number; weight_kg: number;
}

export const BRICK_CATALOG: BrickEntry[] = [
  { id: 'red_clay_standard', name: 'Standard Red Clay Brick', type: 'red_brick', size_mm: { length: 230, width: 110, height: 75 }, units_per_m3: 500, price_per_unit: 10, weight_kg: 3.0 },
  { id: 'fly_ash_brick', name: 'Fly Ash Brick', type: 'fly_ash', size_mm: { length: 230, width: 110, height: 75 }, units_per_m3: 500, price_per_unit: 8, weight_kg: 2.6 },
  { id: 'aac_block', name: 'AAC Block', type: 'aac_block', size_mm: { length: 600, width: 200, height: 200 }, units_per_m3: 42, price_per_unit: 55, weight_kg: 12 },
  { id: 'hollow_concrete_block', name: 'Hollow Concrete Block', type: 'hollow_block', size_mm: { length: 400, width: 200, height: 200 }, units_per_m3: 56, price_per_unit: 45, weight_kg: 15 },
  { id: 'solid_concrete_block', name: 'Solid Concrete Block', type: 'solid_block', size_mm: { length: 400, width: 200, height: 200 }, units_per_m3: 56, price_per_unit: 50, weight_kg: 24 },
]

// ══════════════════════════════════════════════════════════════════════════════
// CEMENT BRANDS
// ══════════════════════════════════════════════════════════════════════════════

export interface CementBrand { id: string; name: string; grade: string; price_per_bag: number }
export const CEMENT_BRANDS: CementBrand[] = [
  { id: 'ultratech', name: 'UltraTech Cement', grade: 'OPC 53', price_per_bag: 430 },
  { id: 'acc', name: 'ACC Cement', grade: 'OPC 53', price_per_bag: 420 },
  { id: 'ambuja', name: 'Ambuja Cement', grade: 'OPC 53', price_per_bag: 415 },
  { id: 'shree', name: 'Shree Cement', grade: 'OPC 53', price_per_bag: 400 },
  { id: 'jk_cement', name: 'JK Cement', grade: 'OPC 53', price_per_bag: 405 },
  { id: 'dalmia', name: 'Dalmia Cement', grade: 'OPC 53', price_per_bag: 395 },
  { id: 'birla', name: 'Birla Cement', grade: 'OPC 43', price_per_bag: 390 },
  { id: 'ramco', name: 'Ramco Cement', grade: 'PPC', price_per_bag: 385 },
  { id: 'custom_cement', name: 'Custom Brand', grade: 'OPC 53', price_per_bag: 430 },
]

// ══════════════════════════════════════════════════════════════════════════════
// STEEL BRANDS & GRADES
// ══════════════════════════════════════════════════════════════════════════════

export interface SteelBrand { id: string; name: string; price_per_kg: number }
export const STEEL_BRAND_LIST: SteelBrand[] = [
  { id: 'tata_tmt', name: 'TATA Tiscon TMT', price_per_kg: 78 },
  { id: 'jsw_steel', name: 'JSW Steel', price_per_kg: 75 },
  { id: 'jindal_panther', name: 'Jindal Panther', price_per_kg: 73 },
  { id: 'kamdhenu', name: 'Kamdhenu TMT', price_per_kg: 72 },
  { id: 'sail', name: 'SAIL TMT', price_per_kg: 70 },
  { id: 'vizag_steel', name: 'Vizag Steel', price_per_kg: 71 },
  { id: 'custom_steel', name: 'Custom Brand', price_per_kg: 75 },
]

export interface SteelGradeEntry { id: string; name: string; multiplier: number }
export const STEEL_GRADE_LIST: SteelGradeEntry[] = [
  { id: 'fe415', name: 'Fe415', multiplier: 0.95 },
  { id: 'fe500', name: 'Fe500', multiplier: 1.00 },
  { id: 'fe550', name: 'Fe550', multiplier: 1.05 },
  { id: 'fe600', name: 'Fe600', multiplier: 1.10 },
]

// ══════════════════════════════════════════════════════════════════════════════
// SAND TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SandType { id: string; name: string; price_per_m3: number; price_per_brass: number }
export const SAND_CATALOG: SandType[] = [
  { id: 'm_sand', name: 'M-Sand (Manufactured)', price_per_m3: 1200, price_per_brass: 3600 },
  { id: 'river_sand', name: 'River Sand', price_per_m3: 1400, price_per_brass: 4200 },
  { id: 'robo_sand', name: 'Robo Sand', price_per_m3: 1100, price_per_brass: 3300 },
]

// ══════════════════════════════════════════════════════════════════════════════
// AGGREGATES
// ══════════════════════════════════════════════════════════════════════════════

export interface AggregateType { id: string; name: string; price_per_m3: number; price_per_brass: number }
export const AGGREGATE_CATALOG: AggregateType[] = [
  { id: 'agg_10mm', name: '10 mm Aggregate', price_per_m3: 1800, price_per_brass: 5400 },
  { id: 'agg_20mm', name: '20 mm Aggregate', price_per_m3: 1600, price_per_brass: 4800 },
  { id: 'agg_40mm', name: '40 mm Aggregate', price_per_m3: 1500, price_per_brass: 4500 },
]

// ══════════════════════════════════════════════════════════════════════════════
// PAINT BRANDS & TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PaintBrand { id: string; name: string; multiplier: number }
export const PAINT_BRAND_LIST: PaintBrand[] = [
  { id: 'asian_paints', name: 'Asian Paints', multiplier: 1.00 },
  { id: 'berger', name: 'Berger Paints', multiplier: 0.95 },
  { id: 'nerolac', name: 'Nerolac', multiplier: 0.90 },
  { id: 'dulux', name: 'Dulux', multiplier: 1.10 },
  { id: 'indigo', name: 'Indigo Paints', multiplier: 0.85 },
  { id: 'custom_paint', name: 'Custom Brand', multiplier: 1.00 },
]

export interface PaintType { id: string; name: string; coverage_m2_per_liter: number; coats: number; bucket_price: number; bucket_liters: number }
export const PAINT_TYPE_LIST: PaintType[] = [
  { id: 'primer', name: 'Primer', coverage_m2_per_liter: 10, coats: 1, bucket_price: 2800, bucket_liters: 20 },
  { id: 'interior_emulsion', name: 'Interior Emulsion', coverage_m2_per_liter: 12, coats: 2, bucket_price: 4800, bucket_liters: 20 },
  { id: 'exterior_emulsion', name: 'Exterior Emulsion', coverage_m2_per_liter: 10, coats: 2, bucket_price: 6000, bucket_liters: 20 },
]

// ══════════════════════════════════════════════════════════════════════════════
// TILE BRANDS, TYPES & SIZES
// ══════════════════════════════════════════════════════════════════════════════

export interface TileBrand { id: string; name: string; multiplier: number }
export const TILE_BRAND_LIST: TileBrand[] = [
  { id: 'kajaria', name: 'Kajaria', multiplier: 1.00 },
  { id: 'somany', name: 'Somany', multiplier: 0.90 },
  { id: 'johnson', name: 'Johnson', multiplier: 0.95 },
  { id: 'nitco', name: 'Nitco', multiplier: 0.85 },
  { id: 'simpolo', name: 'Simpolo', multiplier: 0.80 },
  { id: 'orientbell', name: 'Orientbell', multiplier: 0.88 },
  { id: 'custom_tile', name: 'Custom Brand', multiplier: 1.00 },
]

export interface TileType { id: string; name: string; base_price_per_m2: number; wastage_pct: number }
export const TILE_TYPE_LIST: TileType[] = [
  { id: 'ceramic', name: 'Ceramic', base_price_per_m2: 450, wastage_pct: 5 },
  { id: 'vitrified', name: 'Vitrified', base_price_per_m2: 650, wastage_pct: 5 },
  { id: 'granite', name: 'Granite', base_price_per_m2: 1200, wastage_pct: 8 },
  { id: 'marble', name: 'Marble', base_price_per_m2: 1500, wastage_pct: 10 },
]

export interface TileSize { id: string; name: string; box_coverage_m2: number; tiles_per_box: number }
export const TILE_SIZE_LIST: TileSize[] = [
  { id: '2x2', name: '2×2 ft (600×600 mm)', box_coverage_m2: 1.44, tiles_per_box: 4 },
  { id: '2x4', name: '2×4 ft (600×1200 mm)', box_coverage_m2: 2.16, tiles_per_box: 3 },
  { id: '600x600', name: '600×600 mm', box_coverage_m2: 1.44, tiles_per_box: 4 },
  { id: '800x800', name: '800×800 mm', box_coverage_m2: 1.92, tiles_per_box: 3 },
]

// ══════════════════════════════════════════════════════════════════════════════
// PLUMBING & ELECTRICAL BRANDS
// ══════════════════════════════════════════════════════════════════════════════

export interface MaterialBrand { id: string; name: string; multiplier: number }

export const PLUMBING_BRAND_LIST: MaterialBrand[] = [
  { id: 'ashirvad', name: 'Ashirvad', multiplier: 1.00 },
  { id: 'supreme', name: 'Supreme', multiplier: 1.05 },
  { id: 'astral', name: 'Astral', multiplier: 1.10 },
  { id: 'finolex', name: 'Finolex', multiplier: 0.95 },
  { id: 'prince', name: 'Prince', multiplier: 0.90 },
  { id: 'custom_plumbing', name: 'Custom Brand', multiplier: 1.00 },
]

export const ELECTRICAL_BRAND_LIST: MaterialBrand[] = [
  { id: 'havells', name: 'Havells', multiplier: 1.00 },
  { id: 'anchor', name: 'Anchor', multiplier: 0.85 },
  { id: 'schneider', name: 'Schneider', multiplier: 1.15 },
  { id: 'legrand', name: 'Legrand', multiplier: 1.10 },
  { id: 'gm', name: 'GM Modular', multiplier: 0.80 },
  { id: 'polycab', name: 'Polycab', multiplier: 0.90 },
  { id: 'custom_elec', name: 'Custom Brand', multiplier: 1.00 },
]

// ══════════════════════════════════════════════════════════════════════════════
// REGIONAL PRICING
// ══════════════════════════════════════════════════════════════════════════════

export interface RegionalRate { [key: string]: number }

export const REGIONAL_PRICES: Record<string, Record<string, RegionalRate>> = {
  maharashtra: {
    _default: { concrete_rcc_m3: 6200, steel_tmt_kg: 78, brick_red_pc: 12, cement_bag_50kg: 430, sand_m3: 1500, aggregate_20mm_m3: 1700, plaster_m2: 300, paint_interior_m2: 135, tiles_m2: 700 },
    mumbai: { concrete_rcc_m3: 7000, steel_tmt_kg: 82, brick_red_pc: 14, cement_bag_50kg: 450, sand_m3: 1800, aggregate_20mm_m3: 1900, plaster_m2: 350, paint_interior_m2: 150, tiles_m2: 800 },
    pune: { concrete_rcc_m3: 6000, steel_tmt_kg: 76, brick_red_pc: 11, cement_bag_50kg: 420, sand_m3: 1400, aggregate_20mm_m3: 1600, plaster_m2: 280, paint_interior_m2: 125, tiles_m2: 650 },
    nagpur: { concrete_rcc_m3: 5600, steel_tmt_kg: 74, brick_red_pc: 9, cement_bag_50kg: 400, sand_m3: 1200, aggregate_20mm_m3: 1400, plaster_m2: 260, paint_interior_m2: 110, tiles_m2: 600 },
  },
  karnataka: {
    _default: { concrete_rcc_m3: 5800, steel_tmt_kg: 76, brick_red_pc: 10, cement_bag_50kg: 420, sand_m3: 1350, aggregate_20mm_m3: 1550, plaster_m2: 280, paint_interior_m2: 120, tiles_m2: 650 },
    bangalore: { concrete_rcc_m3: 6500, steel_tmt_kg: 80, brick_red_pc: 12, cement_bag_50kg: 440, sand_m3: 1600, aggregate_20mm_m3: 1750, plaster_m2: 320, paint_interior_m2: 140, tiles_m2: 750 },
  },
  delhi: {
    _default: { concrete_rcc_m3: 5500, steel_tmt_kg: 75, brick_red_pc: 10, cement_bag_50kg: 430, sand_m3: 1400, aggregate_20mm_m3: 1600, plaster_m2: 280, paint_interior_m2: 120, tiles_m2: 650 },
    new_delhi: { concrete_rcc_m3: 5800, steel_tmt_kg: 78, brick_red_pc: 11, cement_bag_50kg: 440, sand_m3: 1500, aggregate_20mm_m3: 1650, plaster_m2: 300, paint_interior_m2: 130, tiles_m2: 700 },
    gurgaon: { concrete_rcc_m3: 6200, steel_tmt_kg: 80, brick_red_pc: 12, cement_bag_50kg: 445, sand_m3: 1550, aggregate_20mm_m3: 1700, plaster_m2: 310, paint_interior_m2: 135, tiles_m2: 720 },
  },
  telangana: {
    _default: { concrete_rcc_m3: 5600, steel_tmt_kg: 74, brick_red_pc: 9, cement_bag_50kg: 400, sand_m3: 1300, aggregate_20mm_m3: 1500, plaster_m2: 260, paint_interior_m2: 110, tiles_m2: 600 },
    hyderabad: { concrete_rcc_m3: 6000, steel_tmt_kg: 77, brick_red_pc: 10, cement_bag_50kg: 420, sand_m3: 1400, aggregate_20mm_m3: 1600, plaster_m2: 280, paint_interior_m2: 125, tiles_m2: 650 },
  },
  tamil_nadu: {
    _default: { concrete_rcc_m3: 5400, steel_tmt_kg: 73, brick_red_pc: 8, cement_bag_50kg: 390, sand_m3: 1250, aggregate_20mm_m3: 1450, plaster_m2: 250, paint_interior_m2: 105, tiles_m2: 580 },
    chennai: { concrete_rcc_m3: 5900, steel_tmt_kg: 76, brick_red_pc: 10, cement_bag_50kg: 410, sand_m3: 1400, aggregate_20mm_m3: 1550, plaster_m2: 280, paint_interior_m2: 120, tiles_m2: 640 },
  },
  gujarat: {
    _default: { concrete_rcc_m3: 5300, steel_tmt_kg: 72, brick_red_pc: 8, cement_bag_50kg: 385, sand_m3: 1200, aggregate_20mm_m3: 1400, plaster_m2: 240, paint_interior_m2: 100, tiles_m2: 560 },
    ahmedabad: { concrete_rcc_m3: 5600, steel_tmt_kg: 75, brick_red_pc: 9, cement_bag_50kg: 400, sand_m3: 1300, aggregate_20mm_m3: 1500, plaster_m2: 260, paint_interior_m2: 115, tiles_m2: 620 },
  },
  rajasthan: {
    _default: { concrete_rcc_m3: 5200, steel_tmt_kg: 73, brick_red_pc: 7, cement_bag_50kg: 380, sand_m3: 1100, aggregate_20mm_m3: 1350, plaster_m2: 230, paint_interior_m2: 95, tiles_m2: 540 },
    jaipur: { concrete_rcc_m3: 5500, steel_tmt_kg: 75, brick_red_pc: 8, cement_bag_50kg: 395, sand_m3: 1200, aggregate_20mm_m3: 1400, plaster_m2: 250, paint_interior_m2: 110, tiles_m2: 600 },
  },
}

export const AVAILABLE_REGIONS: Record<string, string[]> = {
  maharashtra: ['Mumbai', 'Pune', 'Nagpur'],
  karnataka: ['Bangalore'],
  delhi: ['New Delhi', 'Gurgaon'],
  telangana: ['Hyderabad'],
  tamil_nadu: ['Chennai'],
  gujarat: ['Ahmedabad'],
  rajasthan: ['Jaipur'],
}

export const STATE_LABELS: Record<string, string> = {
  maharashtra: 'Maharashtra',
  karnataka: 'Karnataka',
  delhi: 'Delhi NCR',
  telangana: 'Telangana',
  tamil_nadu: 'Tamil Nadu',
  gujarat: 'Gujarat',
  rajasthan: 'Rajasthan',
}

// ══════════════════════════════════════════════════════════════════════════════
// LABOUR RATES
// ══════════════════════════════════════════════════════════════════════════════

export interface LabourRate { id: string; name: string; rate_per_day: number }
export const DEFAULT_LABOUR_RATES: LabourRate[] = [
  { id: 'general_labour', name: 'General Labour', rate_per_day: 650 },
  { id: 'mason', name: 'Mason', rate_per_day: 900 },
  { id: 'helper', name: 'Helper', rate_per_day: 650 },
  { id: 'carpenter', name: 'Carpenter', rate_per_day: 1000 },
  { id: 'bar_bender', name: 'Bar Bender', rate_per_day: 1000 },
  { id: 'painter', name: 'Painter', rate_per_day: 850 },
  { id: 'tile_installer', name: 'Tile Installer', rate_per_day: 900 },
  { id: 'electrician', name: 'Electrician', rate_per_day: 1200 },
  { id: 'plumber', name: 'Plumber', rate_per_day: 1200 },
]

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACTOR CHARGE OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

export const CONTRACTOR_CHARGE_OPTIONS = [
  { value: 8, label: '8% of project cost' },
  { value: 10, label: '10% of project cost' },
  { value: 12, label: '12% of project cost' },
  { value: 15, label: '15% of project cost' },
]

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Get regional rates
// ══════════════════════════════════════════════════════════════════════════════

export function getRegionalRates(state: string, city?: string): RegionalRate {
  const stateKey = state.toLowerCase().replace(/ /g, '_')
  const stateData = REGIONAL_PRICES[stateKey]
  if (!stateData) return REGIONAL_PRICES.delhi._default

  if (city) {
    const cityKey = city.toLowerCase().replace(/ /g, '_')
    if (stateData[cityKey]) return stateData[cityKey]
  }

  return stateData._default
}

// ══════════════════════════════════════════════════════════════════════════════
// MATERIAL CONFIGURATION STATE
// ══════════════════════════════════════════════════════════════════════════════

export interface MaterialConfig {
  brick_brand_id: string
  cement_brand_id: string
  steel_brand_id: string
  steel_grade_id: string
  sand_type_id: string
  aggregate_type_id: string
  paint_brand_id: string
  tile_brand_id: string
  tile_type_id: string
  tile_size_id: string
  plumbing_brand_id: string
  electrical_brand_id: string
  region_state: string
  region_city: string
  contractor_charge_type: 'percentage' | 'fixed'
  contractor_charge_value: number
  gst_pct: number
}

export const DEFAULT_MATERIAL_CONFIG: MaterialConfig = {
  brick_brand_id: 'red_clay_standard',
  cement_brand_id: 'ultratech',
  steel_brand_id: 'tata_tmt',
  steel_grade_id: 'fe500',
  sand_type_id: 'river_sand',
  aggregate_type_id: 'agg_20mm',
  paint_brand_id: 'asian_paints',
  tile_brand_id: 'kajaria',
  tile_type_id: 'vitrified',
  tile_size_id: '2x2',
  plumbing_brand_id: 'ashirvad',
  electrical_brand_id: 'havells',
  region_state: 'maharashtra',
  region_city: '',
  contractor_charge_type: 'percentage',
  contractor_charge_value: 10,
  gst_pct: 18,
}

export function loadMaterialConfig(projectId?: string): MaterialConfig {
  if (typeof window === 'undefined') return DEFAULT_MATERIAL_CONFIG
  try {
    const key = projectId ? `bw_material_config_${projectId}` : 'bw_material_config'
    const saved = localStorage.getItem(key)
    if (saved) return { ...DEFAULT_MATERIAL_CONFIG, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return DEFAULT_MATERIAL_CONFIG
}

export function saveMaterialConfig(config: MaterialConfig, projectId?: string) {
  if (typeof window === 'undefined') return
  const key = projectId ? `bw_material_config_${projectId}` : 'bw_material_config'
  localStorage.setItem(key, JSON.stringify(config))
}

export function recalculateDemoEstimation(projectId: string, config: MaterialConfig) {
  if (typeof window === 'undefined') return
  try {
    const estKeys: string[] = [`bw_demo_est_${projectId}`]
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('bw_demo_est_') && key !== `bw_demo_est_${projectId}`) {
        estKeys.push(key)
      }
    }

    estKeys.forEach(key => {
      const estStr = localStorage.getItem(key)
      if (!estStr) return
      const est = JSON.parse(estStr)
      if (est.project_id !== projectId && key !== `bw_demo_est_${projectId}`) return

      const params = est.user_inputs || {}
      
      const area = parseFloat(params.total_area || 0)
      const floors = parseInt(params.num_floors || 1)
      const ht = parseFloat(params.floor_height || 3.0)
      const wt = parseFloat(params.wall_thickness || 0.23)
      const st = parseFloat(params.slab_thickness || 0.12)
      const cg = (params.concrete_grade || 'M20').toUpperCase()
      const ft = (params.foundation_type || 'isolated').toLowerCase()
      const bt = (params.brick_type || 'red_brick').toLowerCase()
      const waste = 1 + parseFloat(params.waste_percentage || 5) / 100

      const areaM2 = area * 0.092903
      const footprintM2 = areaM2 / floors
      const length = Math.sqrt(footprintM2) * 1.25
      const width = footprintM2 / length
      const perimeterM = 2 * (length + width)
      const wallVolumeM3 = perimeterM * ht * wt * floors * 0.90
      const slabConcrete = footprintM2 * st * floors
      
      const foundationRatios: Record<string, number> = { combined: 0.25, raft: 0.40, pile: 0.30, isolated: 0.20 }
      const totalConcreteVolume = slabConcrete * 1.15 + (slabConcrete * (foundationRatios[ft] || 0.20))
      const totalSteelWeight = totalConcreteVolume * 85.0
      
      const bricksCount = bt === 'red_brick' ? Math.ceil(wallVolumeM3 * 500) : 0
      const blocksCount = bt !== 'red_brick' ? Math.ceil(wallVolumeM3 * 42) : 0

      const wetMortarVol = wallVolumeM3 * 0.30
      const dryMortarVol = wetMortarVol * 1.33
      const masonryMortarCementM3 = (1 / 7) * dryMortarVol
      const masonryMortarSandM3 = (6 / 7) * dryMortarVol

      const plasterInternal = 2.2 * areaM2
      const plasterExternal = perimeterM * ht * floors
      const totalPlasterArea = plasterInternal + plasterExternal
      const wetPlasterVol = (plasterInternal * 0.012) + (plasterExternal * 0.020)
      const dryPlasterVol = wetPlasterVol * 1.33
      const plasterCementM3 = (1 / 5) * dryPlasterVol
      const plasterSandM3 = (4 / 5) * dryPlasterVol

      const paintArea = totalPlasterArea * 1.5
      const tilesArea = areaM2
      const bathroomsArea = areaM2 * 0.12
      const waterproofingArea = footprintM2 + bathroomsArea + (footprintM2 * 0.8)
      const excavationVolume = footprintM2 * 0.35 * 1.5

      const mixRatios: Record<string, number[]> = { M10:[1,3,6], M15:[1,2,4], M20:[1,1.5,3], M25:[1,1,2], M30:[1,0.75,1.5] }
      const ratio = mixRatios[cg] || [1,1.5,3]
      const rSum = ratio.reduce((a,b)=>a+b,0)
      const dryConcreteVolume = totalConcreteVolume * 1.54

      const concreteCementM3 = (ratio[0]/rSum) * dryConcreteVolume
      const concreteSandM3 = (ratio[1]/rSum) * dryConcreteVolume
      const concreteAggM3 = (ratio[2]/rSum) * dryConcreteVolume

      const totalCementM3 = concreteCementM3 + masonryMortarCementM3 + plasterCementM3
      const totalCementBags = Math.ceil((totalCementM3 / 0.0347) * waste)
      const totalSandM3 = (concreteSandM3 + masonryMortarSandM3 + plasterSandM3) * waste
      const totalAggM3 = concreteAggM3 * waste

      const rates = getRegionalRates(config.region_state, config.region_city)

      const cementBrand = CEMENT_BRANDS.find(c => c.id === config.cement_brand_id) || CEMENT_BRANDS[0]
      const cementRate = cementBrand.price_per_bag

      const steelBrand = STEEL_BRAND_LIST.find(s => s.id === config.steel_brand_id) || STEEL_BRAND_LIST[0]
      let steelRate = steelBrand.price_per_kg
      const steelGrade = STEEL_GRADE_LIST.find(g => g.id === config.steel_grade_id) || STEEL_GRADE_LIST[1]
      steelRate *= steelGrade.multiplier

      const brickBrand = BRICK_CATALOG.find(b => b.id === config.brick_brand_id) || BRICK_CATALOG[0]
      const brickRate = brickBrand.price_per_unit

      const sandType = SAND_CATALOG.find(s => s.id === config.sand_type_id) || SAND_CATALOG[0]
      const sandRate = sandType.price_per_m3

      const aggType = AGGREGATE_CATALOG.find(a => a.id === config.aggregate_type_id) || AGGREGATE_CATALOG[0]
      const aggRate = aggType.price_per_m3

      const tileType = TILE_TYPE_LIST.find(t => t.id === config.tile_type_id) || TILE_TYPE_LIST[0]
      const tileBrand = TILE_BRAND_LIST.find(b => b.id === config.tile_brand_id) || TILE_BRAND_LIST[0]
      const tileRate = tileType.base_price_per_m2 * tileBrand.multiplier

      const paintBrand = PAINT_BRAND_LIST.find(p => p.id === config.paint_brand_id) || PAINT_BRAND_LIST[0]

      const concreteCost = Math.round(totalConcreteVolume * waste * (rates.concrete_rcc_m3 || 5500))
      const steelCost = Math.round(totalSteelWeight * waste * steelRate)
      const cementCost = Math.round(totalCementBags * cementRate)
      const sandCost = Math.round(totalSandM3 * sandRate)
      const aggCost = Math.round(totalAggM3 * aggRate)
      const brickCost = Math.round((bricksCount || blocksCount) * waste * brickRate)
      const plasterCost = Math.round(totalPlasterArea * waste * (rates.plaster_m2 || 280))
      const paintCost = Math.round(paintArea * waste * (rates.paint_interior_m2 || 120) * paintBrand.multiplier)
      const tilesCost = Math.round(tilesArea * waste * tileRate)
      const waterproofingCost = Math.round(waterproofingArea * waste * (rates.waterproofing_m2 || 380))
      const excavationCost = Math.round(excavationVolume * (rates.excavation_m3 || 200))

      const shutteringCost = Math.round((totalConcreteVolume * 4.5) * 150)
      const plumbingCost = Math.round(bathroomsArea * 25000)
      const electricalCost = Math.round(areaM2 * 1200)
      const doorCost = (floors * 4) * 8500
      const windowCost = (floors * 6) * 6200

      const totalMatCost = concreteCost + steelCost + cementCost + sandCost + aggCost + brickCost + 
                           plasterCost + paintCost + tilesCost + waterproofingCost + excavationCost +
                           shutteringCost + plumbingCost + electricalCost + doorCost + windowCost

      const labourCost = Math.round(totalMatCost * 0.30)
      const equipmentCost = Math.round(totalMatCost * 0.05)
      const baseExec = totalMatCost + labourCost + equipmentCost
      
      const contractorVal = config.contractor_charge_value
      const contractor = config.contractor_charge_type === 'fixed'
        ? contractorVal
        : Math.round(baseExec * (contractorVal / 100))

      const contingency = Math.round(baseExec * 0.05)
      const taxable = baseExec + contractor + contingency
      const gst = Math.round(taxable * ((config.gst_pct || 18) / 100))
      const grandTotal = taxable + gst

      est.materials = {
        concrete_volume: +(totalConcreteVolume*waste).toFixed(2),
        steel_weight: +(totalSteelWeight*waste).toFixed(0),
        cement_bags: totalCementBags,
        sand_volume: +totalSandM3.toFixed(2),
        aggregate_volume: +totalAggM3.toFixed(2),
        bricks_count: bt==='red_brick'?Math.ceil(bricksCount*waste):0,
        blocks_count: bt!=='red_brick'?Math.ceil(blocksCount*waste):0,
        mortar_volume: +(wetMortarVol*waste).toFixed(2),
        plaster_area: +(totalPlasterArea*waste).toFixed(2),
        paint_area: +(paintArea*waste).toFixed(2),
        tiles_area: +(tilesArea*waste).toFixed(2),
        waterproofing_area: +(waterproofingArea*waste).toFixed(2),
        excavation_volume: +excavationVolume.toFixed(2),
        formwork_area: +(totalConcreteVolume*4.5).toFixed(2),
        doors_count: floors*4,
        windows_count: floors*6
      }

      est.cost_breakdown = {
        concrete_cost: concreteCost,
        steel_cost: steelCost,
        cement_cost: cementCost,
        sand_cost: sandCost,
        aggregate_cost: aggCost,
        brick_cost: bt==='red_brick'?brickCost:0,
        block_cost: bt!=='red_brick'?brickCost:0,
        mortar_cost: 0,
        plaster_cost: plasterCost,
        paint_cost: paintCost,
        tiles_cost: tilesCost,
        waterproofing_cost: waterproofingCost,
        excavation_cost: excavationCost,
        shuttering_cost: shutteringCost,
        plumbing_cost: plumbingCost,
        electrical_cost: electricalCost,
        door_cost: doorCost,
        window_cost: windowCost,
        labour_cost: labourCost,
        equipment_cost: equipmentCost,
        total_material_cost: totalMatCost,
        gst_amount: gst,
        contractor_margin: contractor,
        contingency,
        grand_total: grandTotal
      }

      est.total_cost = grandTotal
      localStorage.setItem(key, JSON.stringify(est))
    })
  } catch (e) {
    console.error("Local recalculation failed:", e)
  }
}
