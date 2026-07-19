/**
 * BuildWise AI — Engineering Estimation & Takeoff Engine
 * ========================================================
 * Standard civil quantity takeoff module using deterministic engineering
 * formulas, Bureau of Indian Standards (IS 1200 / IS 456), and CPWD productivity indices.
 */

import type {
  FloorPlanAnalysisResult, AIRoom, AIWall, AIDoor, AIWindow, AIColumn, AIStaircase
} from './floor-plan-ai/types'

// Input configuration interface representing user configurations
export interface TakeoffParams {
  building_type: string         // residential, commercial, etc.
  num_floors: number            // default 1
  floor_height: number          // default 3.0m
  wall_thickness: number        // default 0.23m
  slab_thickness: number        // default 0.12m
  concrete_grade: string        // M15, M20, M25, M30
  steel_grade: string           // Fe415, Fe500, Fe550, Fe600
  mortar_ratio: string          // 1:4, 1:5, 1:6
  foundation_type: string       // isolated, raft, combined, pile
  roof_type: string             // flat_rcc, pitched
  brick_type: string            // red_brick, fly_ash, aac_block, hollow_block
  waste_percentage: number      // default 5%
  
  // Regional settings (optional overrides)
  region_state?: string
  region_city?: string
  
  // Custom unit rates (INR)
  rate_brick?: number           // per brick / block
  rate_cement?: number          // per 50kg bag
  rate_steel?: number           // per kg
  rate_sand?: number            // per m3
  rate_aggregate?: number       // per m3
  rate_plaster?: number         // per m2
  rate_paint?: number           // per m2
  rate_tiles?: number           // per m2
}

export interface EstimationResult {
  id: string
  project_id: string
  created_at: string
  user_inputs: TakeoffParams
  
  materials: {
    // Volume / Areas
    net_wall_volume_m3: number
    net_wall_area_m2: number
    mortar_volume_m3: number
    concrete_volume: number     // total RCC m3
    excavation_volume: number   // excavation m3
    formwork_area: number       // shuttering m2
    plaster_area: number        // plaster m2
    paint_area: number          // paint m2
    tiles_area: number          // tile m2
    waterproofing_area: number  // m2
    
    // Concrete parts
    concrete_slabs_m3: number
    concrete_columns_m3: number
    concrete_beams_m3: number
    concrete_footings_m3: number
    concrete_stairs_m3: number

    // Final Counts
    bricks_count: number
    blocks_count: number
    cement_bags: number
    sand_volume: number         // sand m3
    aggregate_volume: number    // aggregate m3
    steel_weight: number        // steel kg
    tiles_boxes: number
    paint_liters: number
    adhesive_kg: number
    grout_kg: number
    
    doors_count: number
    windows_count: number
  }
  
  cost_breakdown: {
    brick_cost: number
    block_cost: number
    cement_cost: number
    sand_cost: number
    aggregate_cost: number
    steel_cost: number
    plaster_cost: number
    paint_cost: number
    tiles_cost: number
    waterproofing_cost: number
    excavation_cost: number
    labour_cost: number
    equipment_cost: number
    transport_cost: number
    
    total_material_cost: number
    contractor_margin: number
    contingency: number
    gst_amount: number
    grand_total: number
  }
  
  room_takeoffs: {
    room_id: string
    label: string
    area_m2: number
    wall_area_m2: number
    wall_volume_m3: number
    bricks_count: number
    cement_bags: number
    sand_volume_m3: number
    plaster_m2: number
    paint_liters: number
    tiles_area_m2: number
    tiles_boxes: number
    total_cost: number
  }[]
  
  total_cost: number
  currency: 'INR'
  assumptions: string[]
  confidence_score: number
  data_source: Record<string, 'AI Detected' | 'User Input' | 'Engineering Default'>
}

// Concrete Mix proportions (IS 456 / IS 10262)
// concrete_grade -> [cement_ratio, sand_ratio, aggregate_ratio, sum_of_ratios]
const CONCRETE_MIX_PROPORTIONS: Record<string, [number, number, number, number]> = {
  M10: [1, 3, 6, 10],
  M15: [1, 2, 4, 7],
  M20: [1, 1.5, 3, 5.5],
  M25: [1, 1, 2, 4],
  M30: [1, 0.75, 1.5, 3.25]
}

/**
 * Main Estimation Calculator
 */
export function calculateTakeoff(
  plan: FloorPlanAnalysisResult,
  params: TakeoffParams
): EstimationResult {
  const resultId = `est_${Date.now()}`
  
  // ── Step 0: Extract Geometry & Defaults ─────────────────────────────────────
  const rooms = plan.rooms || []
  const walls = plan.walls || []
  const doors = plan.doors || []
  const windows = plan.windows || []
  const columns = plan.columns || []
  const staircases = plan.staircases || []
  
  const floors = params.num_floors || 1
  const floorHt = params.floor_height || 3.0
  const wallThickness = params.wall_thickness || 0.23
  const slabThickness = params.slab_thickness || 0.12
  const wasteMult = 1 + (params.waste_percentage || 5) / 100
  
  // ── Step 1: Net Wall Volume & Masonry Takeoff ──────────────────────────────
  let totalGrossWallVol = 0
  let totalDoorOpeningVol = 0
  let totalWindowOpeningVol = 0
  
  // Map wall volumes
  walls.forEach(w => {
    const height = floorHt - slabThickness // Wall height under slab
    const wVol = w.length_m * w.thickness_m * height
    totalGrossWallVol += wVol
    
    // Deduct openings connected to this wall
    const wallDoors = doors.filter(d => d.wall_id === w.id)
    wallDoors.forEach(d => {
      totalDoorOpeningVol += d.width_m * d.height_m * w.thickness_m
    })
    
    const wallWins = windows.filter(win => win.wall_id === w.id)
    wallWins.forEach(win => {
      totalWindowOpeningVol += win.width_m * win.height_m * w.thickness_m
    })
  })
  
  // Repeat for all floors
  const netWallVolSingleFloor = Math.max(0, totalGrossWallVol - totalDoorOpeningVol - totalWindowOpeningVol)
  const netWallVolTotal = netWallVolSingleFloor * floors
  const netWallAreaTotal = (walls.reduce((s, w) => s + w.length_m, 0) * (floorHt - slabThickness)) * floors
  
  // ── Step 2: Brick Count vs AAC Block counts ────────────────────────────────
  let bricksCount = 0
  let blocksCount = 0
  let mortarVolTotal = 0
  let brickUnitRate = params.rate_brick ?? 10
  
  if (params.brick_type === 'aac_block') {
    // Standard AAC Block size: 600 x 200 x 200 mm
    // Joint thickness: 3mm adhesive
    const blockVg = 0.603 * 0.203 * 0.203 // with joints
    blocksCount = Math.ceil((netWallVolTotal / blockVg) * wasteMult)
    mortarVolTotal = netWallVolTotal * 0.015 // 1.5% of net wall volume is adhesive glue
    brickUnitRate = params.rate_brick ?? 55
  } else {
    // Red clay brick/fly ash: traditional size 230 x 110 x 75 mm
    // Mortar joint: 10mm
    const jointThick = 0.01
    const brickL = 0.23, brickW = 0.11, brickH = 0.075
    const brickVg = (brickL + jointThick) * (brickW + jointThick) * (brickH + jointThick) // 0.002448 m3
    const brickVn = brickL * brickW * brickH // 0.0018975 m3
    
    const bricksNoWaste = netWallVolTotal / brickVg
    bricksCount = Math.ceil(brickBricks(bricksNoWaste) * wasteMult)
    
    // Wet mortar volume
    mortarVolTotal = Math.max(0, netWallVolTotal - (bricksNoWaste * brickVn))
  }
  
  function brickBricks(val: number): number {
    return isNaN(val) || !isFinite(val) ? 0 : val
  }
  
  // ── Step 3: Concrete Structural Elements (IS 456) ───────────────────────────
  // Slab Footprint area
  const slabAreaPerFloor = plan.total_area_m2 || rooms.reduce((s, r) => s + r.area_m2, 0)
  const slabConcreteVolTotal = slabAreaPerFloor * slabThickness * floors
  
  // Columns Concrete Volume
  let columnsConcreteVolTotal = 0
  const estimatedColumnsCount = columns.length > 0 ? columns.length : Math.ceil(slabAreaPerFloor / 15)
  if (columns.length > 0) {
    columns.forEach(col => {
      const sizeM = col.size_m || [0.23, 0.23]
      columnsConcreteVolTotal += sizeM[0] * sizeM[1] * floorHt
    })
    columnsConcreteVolTotal *= floors
  } else {
    // Assumption: columns are 230x230mm
    columnsConcreteVolTotal = estimatedColumnsCount * (0.23 * 0.23) * floorHt * floors
  }
  
  // Beams Concrete Volume
  // Beam size: 230mm x 350mm running along all wall lengths
  const wallTotalLength = walls.reduce((s, w) => s + w.length_m, 0)
  const beamsConcreteVolTotal = (wallTotalLength * 0.23 * 0.35) * floors
  
  // Footings Concrete Volume
  // 1.2m x 1.2m footing size, 400mm thick
  const footingsConcreteVolTotal = estimatedColumnsCount * (1.2 * 1.2 * 0.40)
  
  // Staircase Concrete Volume
  // Each stair is assumed to consume 1.8 m3 of concrete
  const stairsConcreteVolTotal = staircases.length * 1.8 * floors
  
  // Total Concrete RCC
  const rccConcreteVolTotal = slabConcreteVolTotal + columnsConcreteVolTotal + beamsConcreteVolTotal + footingsConcreteVolTotal + stairsConcreteVolTotal
  
  // ── Step 4: Steel Reinforcement Weight (IS 1786 indices) ────────────────────
  // Footings: 80 kg/m3, Columns: 120 kg/m3, Beams: 150 kg/m3, Slabs: 90 kg/m3, Stairs: 80 kg/m3
  const steelWeightTotal = (
    (footingsConcreteVolTotal * 80) +
    (columnsConcreteVolTotal * 120) +
    (beamsConcreteVolTotal * 150) +
    (slabConcreteVolTotal * 90) +
    (stairsConcreteVolTotal * 80)
  ) * wasteMult
  
  // ── Step 5: Dry proportions for Concrete & Mortar ──────────────────────────
  // Concrete Dry Volume Factor: 1.54
  const concreteDryVolTotal = rccConcreteVolTotal * 1.54
  const mixGrade = params.concrete_grade || 'M20'
  const mix = CONCRETE_MIX_PROPORTIONS[mixGrade] || CONCRETE_MIX_PROPORTIONS.M20
  const mixSum = mix[3]
  
  // RCC cement bags, sand, aggregates
  const rccCementBags = Math.ceil(((1 / mixSum) * concreteDryVolTotal / 0.0347) * wasteMult)
  const rccSandVol = ((mix[1] / mixSum) * concreteDryVolTotal) * wasteMult
  const rccAggVol = ((mix[2] / mixSum) * concreteDryVolTotal) * wasteMult
  
  // Mortar Dry Volume Factor: 1.33
  // Mortar ratio (e.g. 1:4, CM = 4)
  const mortarRatioText = params.mortar_ratio || '1:5'
  const mortarSandRatio = parseFloat(mortarRatioText.split(':')[1]) || 5.0
  const mortarSum = 1 + mortarSandRatio
  
  const mortarDryVolTotal = mortarVolTotal * 1.33
  const masonryCementBags = params.brick_type === 'aac_block' ? 0 : Math.ceil(((1 / mortarSum) * mortarDryVolTotal / 0.0347) * wasteMult)
  const masonrySandVol = params.brick_type === 'aac_block' ? 0 : ((mortarSandRatio / mortarSum) * mortarDryVolTotal) * wasteMult
  
  // ── Step 6: Plastering (IS 1200) ──────────────────────────────────────────
  // Internal wall face area
  const internalPlasterArea = rooms.reduce((s, r) => s + (r.perimeter_m * floorHt), 0) * floors
  // External wall outer perimeter (footprint perimeter)
  const footprintPerimeter = Math.sqrt(slabAreaPerFloor) * 4.0 // Approximate square boundary
  const externalPlasterArea = (footprintPerimeter * floorHt) * floors
  
  const totalPlasterArea = (internalPlasterArea + externalPlasterArea) * 0.90 // 10% openings offset
  
  // Plaster Cement/Sand calculations: Internal (12mm, 1:4) + External (20mm, 1:5)
  const internalPlasterVol = (internalPlasterArea * 0.90) * 0.012
  const externalPlasterVol = (externalPlasterArea * 0.90) * 0.020
  
  const plasterCementBags = (
    Math.ceil(((1 / 5) * (internalPlasterVol * 1.33) / 0.0347) * wasteMult) +
    Math.ceil(((1 / 6) * (externalPlasterVol * 1.33) / 0.0347) * wasteMult)
  )
  const plasterSandVol = (
    ((4 / 5) * (internalPlasterVol * 1.33)) +
    ((5 / 6) * (externalPlasterVol * 1.33))
  ) * wasteMult
  
  // ── Step 7: Flooring & Painting ───────────────────────────────────────────
  // Tiling Vitrified 2x2 boxes
  const totalFlooringArea = rooms.reduce((s, r) => s + r.area_m2, 0) * floors
  const tileBoxCoverage = 1.44 // 2x2 ft box
  const tilesBoxes = Math.ceil((totalFlooringArea / tileBoxCoverage) * 1.08) // 8% waste
  const flooringAdhesiveKg = totalFlooringArea * 5.5 // 5.5 kg per m2
  const flooringGroutKg = totalFlooringArea * 0.20 // 0.20 kg per m2
  
  // Painting Emulsion (Primer + Putty + Emulsion Paint)
  const paintableArea = totalPlasterArea * 1.20 // ceiling + details
  const paintLiters = Math.ceil((paintableArea / 6) * 2) // 2 coats, 6 m2 per liter
  
  // ── Step 8: Total Materials Sums ──────────────────────────────────────────
  const finalCementBags = rccCementBags + masonryCementBags + plasterCementBags
  const finalSandVol = rccSandVol + masonrySandVol + plasterSandVol
  const finalAggVol = rccAggVol // aggregates only in RCC
  
  // ── Step 9: Rates & Cost Calculator (INR) ──────────────────────────────────
  const cementPriceBag = params.rate_cement ?? 430
  const steelPriceKg = params.rate_steel ?? 75
  const sandPriceM3 = params.rate_sand ?? 1400
  const aggPriceM3 = params.rate_aggregate ?? 1600
  const plasterPriceM2 = params.rate_plaster ?? 280
  const paintPriceM2 = params.rate_paint ?? 120
  const tilesPriceM2 = params.rate_tiles ?? 650
  
  const costBricks = bricksCount * brickUnitRate
  const costBlocks = blocksCount * brickUnitRate
  const costCement = finalCementBags * cementPriceBag
  const costSand = finalSandVol * sandPriceM3
  const costAgg = finalAggVol * aggPriceM3
  const costSteel = steelWeightTotal * steelPriceKg
  const costPlaster = totalPlasterArea * plasterPriceM2
  const costPaint = paintableArea * paintPriceM2
  const costTiles = totalFlooringArea * tilesPriceM2
  
  // Excavation cost
  const excavationVolume = slabAreaPerFloor * 0.35 * 1.5 // 0.35m depth + shoring multiplier
  const excavationPriceM3 = 200
  const costExcavation = excavationVolume * excavationPriceM3
  
  // Waterproofing cost
  const waterproofingArea = slabAreaPerFloor + (totalFlooringArea * 0.1)
  const costWaterproofing = waterproofingArea * 380
  
  // ── Step 10: Labor & Machinery Rentals ─────────────────────────────────────
  // Masons/helpers outturns
  const masonDays = Math.ceil((netWallVolTotal / 1.25) + (totalPlasterArea / 8.0) + (totalFlooringArea / 6.0))
  const helperDays = Math.ceil(masonDays * 1.5 + (excavationVolume / 3.5) + (rccConcreteVolTotal / 2.5))
  const supervisorDays = Math.ceil((masonDays + helperDays) / 10)
  
  const costLabour = (masonDays * 900) + (helperDays * 650) + (supervisorDays * 1200)
  
  // Machinery rental (mixer, vibrator, cutter)
  const concreteMixerRent = Math.ceil(rccConcreteVolTotal / 8.0) * 1800 // ₹1800/day
  const needleVibratorRent = Math.ceil(rccConcreteVolTotal / 8.0) * 500
  const costEquipment = concreteMixerRent + needleVibratorRent + 5000 // scaffolding fix
  
  // Transportation cost (fuel + distance)
  const materialsWeightTons = (
    ((bricksCount * 3.0) + (blocksCount * 12)) + // bricks
    (finalCementBags * 50) + // cement
    (steelWeightTotal) + // steel
    (finalSandVol * 1600) + // sand density
    (finalAggVol * 1500) // aggregate density
  ) / 1000
  
  // Assume ₹350 per Ton for general transportation logistics
  const costTransport = Math.ceil(materialsWeightTons * 350)
  
  // Summaries
  const costMaterial = costBricks + costBlocks + costCement + costSand + costAgg + costSteel + costPlaster + costPaint + costTiles + costWaterproofing + costExcavation
  
  const baseExecution = costMaterial + costLabour + costEquipment + costTransport
  const margin = Math.round(baseExecution * 0.10) // 10% Contractor margin
  const contingency = Math.round(baseExecution * 0.05) // 5% contingency
  const taxable = baseExecution + margin + contingency
  const gst = Math.round(taxable * 0.18) // 18% GST
  const grandTotal = taxable + gst
  
  // ── Step 11: Room-Wise Estimations ─────────────────────────────────────────
  const roomTakeoffs = rooms.map(room => {
    // Distribute connected walls
    let rWallVol = 0
    let rWallArea = 0
    
    // Find adjacent walls
    walls.forEach(w => {
      const isConnected = w.room_ids?.includes(room.id)
      if (isConnected) {
        const height = floorHt - slabThickness
        const divisor = w.room_ids.length > 0 ? w.room_ids.length : 1
        rWallVol += (w.length_m * w.thickness_m * height) / divisor
        rWallArea += (w.length_m * height) / divisor
      }
    })
    
    if (rWallVol === 0) {
      rWallArea = room.perimeter_m * floorHt
      rWallVol = rWallArea * wallThickness
    }
    
    const rBricks = params.brick_type === 'aac_block' 
      ? 0 
      : Math.ceil((rWallVol / 0.002448) * wasteMult)
    const rBlocks = params.brick_type === 'aac_block'
      ? Math.ceil((rWallVol / 0.024849) * wasteMult)
      : 0
      
    const rMasonryCement = params.brick_type === 'aac_block' ? 0 : Math.ceil(((1 / mortarSum) * (rWallVol * 0.22 * 1.33) / 0.0347) * wasteMult)
    const rPlasterCement = Math.ceil(((1 / 5) * (rWallArea * 2 * 0.012 * 1.33) / 0.0347) * wasteMult)
    const rCement = rMasonryCement + rPlasterCement
    
    const rSand = (
      (params.brick_type === 'aac_block' ? 0 : ((mortarSandRatio / mortarSum) * (rWallVol * 0.22 * 1.33))) +
      (((4 / 5) * (rWallArea * 2 * 0.012 * 1.33)))
    ) * wasteMult
    
    const rPaintL = Math.ceil((rWallArea * 1.2 / 6) * 2)
    const rTilesBoxes = Math.ceil((room.area_m2 / tileBoxCoverage) * 1.08)
    
    // Proportional cost mapping
    const roomCost = Math.round((room.area_m2 / slabAreaPerFloor) * grandTotal)
    
    return {
      room_id: room.id,
      label: room.label,
      area_m2: room.area_m2,
      wall_area_m2: rWallArea,
      wall_volume_m3: rWallVol,
      bricks_count: params.brick_type === 'aac_block' ? rBlocks : rBricks,
      cement_bags: rCement,
      sand_volume_m3: rSand,
      plaster_m2: rWallArea * 2,
      paint_liters: rPaintL,
      tiles_area_m2: room.area_m2,
      tiles_boxes: rTilesBoxes,
      total_cost: roomCost
    }
  })
  
  // ── Step 12: Generate Assumptions List ─────────────────────────────────────
  const assumptions = [
    `Wall height set to ${floorHt}m (Nominal ${floorHt - slabThickness}m masonry height).`,
    `Concrete Mix: ${params.concrete_grade} (${mixGrade === 'M20' ? '1:1.5:3' : mixGrade === 'M25' ? '1:1:2' : '1:2:4'}).`,
    `Steel rebar calculated using nominal structural densities (Slabs: 90kg/m³, Beams: 150kg/m³, Columns: 120kg/m³, Footings: 80kg/m³).`,
    `Brickwork Joint: ${params.brick_type === 'aac_block' ? '3mm adhesive thin-bed' : '10mm cement-sand mortar joint'}.`,
    `Plastering: 12mm internal cement-sand mortar (1:4), 20mm external (1:5).`,
    `Tile waste factor of ${(params.waste_percentage || 5)}% applied to flooring box counts.`,
    `Contingencies set to 5% and Contractor Margin at 10% on execution values.`,
    `GST calculated at standard 18% taxable rate.`
  ]
  
  // ── Step 13: Confidence Score ─────────────────────────────────────────────
  let confidence = 0.90
  if (columns.length === 0) confidence -= 0.15
  if (staircases.length === 0) confidence -= 0.05
  if (plan.drawing_classification?.drawing_type !== 'architectural') confidence -= 0.20
  
  const dataSource: Record<string, 'AI Detected' | 'User Input' | 'Engineering Default'> = {
    room_dimensions: plan.rooms ? 'AI Detected' : 'Engineering Default',
    walls_thickness: plan.wall_thickness_m ? 'AI Detected' : 'Engineering Default',
    columns_positions: plan.columns && plan.columns.length > 0 ? 'AI Detected' : 'Engineering Default',
    floor_height: params.floor_height ? 'User Input' : 'Engineering Default',
    materials_wastage: params.waste_percentage ? 'User Input' : 'Engineering Default',
    concrete_mixes: params.concrete_grade ? 'User Input' : 'Engineering Default'
  }

  return {
    id: resultId,
    project_id: plan.project_id || plan.id,
    created_at: new Date().toISOString(),
    user_inputs: params,
    materials: {
      net_wall_volume_m3: netWallVolTotal,
      net_wall_area_m2: netWallAreaTotal,
      mortar_volume_m3: mortarVolTotal,
      concrete_volume: rccConcreteVolTotal,
      excavation_volume: excavationVolume,
      formwork_area: rccConcreteVolTotal * 4.5,
      plaster_area: totalPlasterArea,
      paint_area: paintableArea,
      tiles_area: totalFlooringArea,
      waterproofing_area: waterproofingArea,
      
      concrete_slabs_m3: slabConcreteVolTotal,
      concrete_columns_m3: columnsConcreteVolTotal,
      concrete_beams_m3: beamsConcreteVolTotal,
      concrete_footings_m3: footingsConcreteVolTotal,
      concrete_stairs_m3: stairsConcreteVolTotal,
      
      bricks_count: params.brick_type === 'aac_block' ? 0 : bricksCount,
      blocks_count: params.brick_type === 'aac_block' ? blocksCount : 0,
      cement_bags: finalCementBags,
      sand_volume: finalSandVol,
      aggregate_volume: finalAggVol,
      steel_weight: steelWeightTotal,
      tiles_boxes: tilesBoxes,
      paint_liters: paintLiters,
      adhesive_kg: flooringAdhesiveKg,
      grout_kg: flooringGroutKg,
      
      doors_count: doors.length * floors,
      windows_count: windows.length * floors
    },
    cost_breakdown: {
      brick_cost: params.brick_type === 'aac_block' ? 0 : costBricks,
      block_cost: params.brick_type === 'aac_block' ? costBlocks : 0,
      cement_cost: costCement,
      sand_cost: costSand,
      aggregate_cost: costAgg,
      steel_cost: costSteel,
      plaster_cost: costPlaster,
      paint_cost: costPaint,
      tiles_cost: costTiles,
      waterproofing_cost: costWaterproofing,
      excavation_cost: costExcavation,
      labour_cost: costLabour,
      equipment_cost: costEquipment,
      transport_cost: costTransport,
      
      total_material_cost: costMaterial,
      contractor_margin: margin,
      contingency: contingency,
      gst_amount: gst,
      grand_total: grandTotal
    },
    room_takeoffs: roomTakeoffs,
    total_cost: grandTotal,
    currency: 'INR',
    assumptions: assumptions,
    confidence_score: Math.max(0.40, confidence),
    data_source: dataSource
  }
}
