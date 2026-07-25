// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Regional Cost Database & Dynamic Rate Engine (Document 6)
// Indian Construction Hub Pricing, Brand Catalogs, Logistics, & AI Cost Intelligence
// ══════════════════════════════════════════════════════════════════════════════

export interface RegionalRateConfig {
  state: string
  city: string
  rates: {
    brick_red_per_unit: number
    brick_aac_per_unit: number
    cement_per_bag: number
    steel_per_kg: number
    sand_per_m3: number
    aggregate_per_m3: number
    plaster_per_m2: number
    paint_per_m2: number
    tiles_per_m2: number
    mason_daily_wage: number
    helper_daily_wage: number
    bender_daily_wage: number
    carpenter_daily_wage: number
    supervisor_daily_wage: number
    mixer_daily_rent: number
    vibrator_daily_rent: number
    transport_per_ton_km: number
  }
}

export interface CostRecommendation {
  id: string
  title: string
  category: 'material_brand' | 'sand_type' | 'masonry_type' | 'logistics'
  estimated_savings_inr: number
  description: string
  pros: string[]
  cons: string[]
}

// ── Pre-configured Indian Construction Regional Rates ─────────────────────────

export const INDIAN_REGIONAL_RATES: Record<string, RegionalRateConfig> = {
  maharashtra: {
    state: 'Maharashtra',
    city: 'Mumbai / Pune',
    rates: {
      brick_red_per_unit: 11,
      brick_aac_per_unit: 58,
      cement_per_bag: 440,
      steel_per_kg: 76,
      sand_per_m3: 1500,
      aggregate_per_m3: 1650,
      plaster_per_m2: 290,
      paint_per_m2: 125,
      tiles_per_m2: 680,
      mason_daily_wage: 950,
      helper_daily_wage: 700,
      bender_daily_wage: 1050,
      carpenter_daily_wage: 950,
      supervisor_daily_wage: 1300,
      mixer_daily_rent: 1900,
      vibrator_daily_rent: 550,
      transport_per_ton_km: 18,
    }
  },
  karnataka: {
    state: 'Karnataka',
    city: 'Bengaluru / Mysuru',
    rates: {
      brick_red_per_unit: 10,
      brick_aac_per_unit: 55,
      cement_per_bag: 430,
      steel_per_kg: 74,
      sand_per_m3: 1400,
      aggregate_per_m3: 1600,
      plaster_per_m2: 280,
      paint_per_m2: 120,
      tiles_per_m2: 650,
      mason_daily_wage: 900,
      helper_daily_wage: 650,
      bender_daily_wage: 1000,
      carpenter_daily_wage: 900,
      supervisor_daily_wage: 1200,
      mixer_daily_rent: 1800,
      vibrator_daily_rent: 500,
      transport_per_ton_km: 16,
    }
  },
  telangana: {
    state: 'Telangana',
    city: 'Hyderabad',
    rates: {
      brick_red_per_unit: 9.5,
      brick_aac_per_unit: 52,
      cement_per_bag: 415,
      steel_per_kg: 72,
      sand_per_m3: 1350,
      aggregate_per_m3: 1550,
      plaster_per_m2: 270,
      paint_per_m2: 115,
      tiles_per_m2: 620,
      mason_daily_wage: 850,
      helper_daily_wage: 600,
      bender_daily_wage: 950,
      carpenter_daily_wage: 850,
      supervisor_daily_wage: 1150,
      mixer_daily_rent: 1750,
      vibrator_daily_rent: 480,
      transport_per_ton_km: 15,
    }
  },
  delhi: {
    state: 'Delhi NCR',
    city: 'Delhi / Noida / Gurugram',
    rates: {
      brick_red_per_unit: 9.0,
      brick_aac_per_unit: 54,
      cement_per_bag: 425,
      steel_per_kg: 75,
      sand_per_m3: 1450,
      aggregate_per_m3: 1600,
      plaster_per_m2: 285,
      paint_per_m2: 122,
      tiles_per_m2: 660,
      mason_daily_wage: 920,
      helper_daily_wage: 680,
      bender_daily_wage: 1020,
      carpenter_daily_wage: 920,
      supervisor_daily_wage: 1250,
      mixer_daily_rent: 1850,
      vibrator_daily_rent: 520,
      transport_per_ton_km: 17,
    }
  }
}

/**
 * Returns regional construction rates for a given state or default average.
 */
export function getRegionalRates(stateKey = 'karnataka'): RegionalRateConfig {
  const key = stateKey.toLowerCase().replace(/\s+/g, '')
  return INDIAN_REGIONAL_RATES[key] || INDIAN_REGIONAL_RATES['karnataka']
}

/**
 * Calculates transportation cost based on weight (tons) and distance (km).
 */
export function calculateTransportationCost(
  materialsWeightTons: number,
  distanceKm = 25,
  ratePerTonKm = 16
): { totalCost: number; loadingCost: number; freightCost: number; tripsCount: number } {
  const tripsCount = Math.ceil(materialsWeightTons / 10) // 10-Ton truck capacity
  const freightCost = Math.ceil(materialsWeightTons * distanceKm * ratePerTonKm)
  const loadingCost = Math.ceil(materialsWeightTons * 120) // ₹120 per ton loading/unloading
  const totalCost = freightCost + loadingCost

  return { totalCost, loadingCost, freightCost, tripsCount }
}

/**
 * Generates cost intelligence and brand switching recommendations.
 */
export function generateCostSavingsRecommendations(
  netWallVolM3: number,
  sandVolM3: number,
  isAAC: boolean
): CostRecommendation[] {
  const recs: CostRecommendation[] = []

  if (!isAAC) {
    const redBrickCost = Math.ceil(netWallVolM3 / 0.002448) * 10
    const aacBlockCost = Math.ceil(netWallVolM3 / 0.0248) * 55
    const savings = redBrickCost - aacBlockCost
    if (savings > 0) {
      recs.push({
        id: 'rec_aac_switch',
        title: 'Switch to AAC Blocks (Autoclaved Aerated Concrete)',
        category: 'masonry_type',
        estimated_savings_inr: savings,
        description: `Switching from traditional red clay bricks to 600×200×200mm AAC blocks reduces masonry cost and speeds up wall construction.`,
        pros: ['60% lighter dead load on RCC frame', 'Faster installation speed', 'Lower jointing mortar consumption'],
        cons: ['Requires specialized thin-bed adhesive', 'Requires skilled masons']
      })
    }
  }

  recs.push({
    id: 'rec_msand_switch',
    title: 'Use Manufactured Sand (M-Sand) for Concrete & Masonry',
    category: 'sand_type',
    estimated_savings_inr: Math.round(sandVolM3 * 250),
    description: `Replacing natural river sand with IS 383 Zone-II M-Sand saves ₹250/m³ in raw material cost while eliminating river silt impurities.`,
    pros: ['100% free from silt and organic clay', 'Consistent Zone-II grading', 'Environmentally sustainable'],
    cons: ['Requires proper plasticizer dosage in high-grade concrete']
  })

  return recs
}
