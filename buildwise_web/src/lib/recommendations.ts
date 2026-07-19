export interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  savings_est: number // percentage or absolute
  category: 'material' | 'design' | 'logistics' | 'sustainability'
  actionableText: string
  advantages: string[]
  disadvantages: string[]
  carbonReduction?: string
  timeReduction?: string
}

export function generateRecommendations(estimation: any): Recommendation[] {
  const m = estimation.materials || {}
  const recs: Recommendation[] = []

  // Check if brick is red brick, suggest AAC
  const isRedBrick = (m.bricks_count || 0) > 0
  if (isRedBrick) {
    recs.push({
      id: 'rec_aac_blocks',
      title: 'Substitute Red Clay Bricks with AAC Blocks',
      description: 'AAC (Autoclaved Aerated Concrete) blocks are larger, lighter, and offer superior thermal insulation. They reduce mortar joint thickness by 70% and speed up structural masonry laying.',
      impact: 'high',
      savings_est: 15,
      category: 'material',
      actionableText: 'Change masonry unit type to AAC Blocks in Calculator Settings.',
      advantages: [
        'Reduces dead load on columns and beams by 50%',
        'Saves up to 60% of jointing cement mortar',
        'Excellent thermal insulation, lowering HVAC energy loads'
      ],
      disadvantages: [
        'Higher initial block material unit cost',
        'Requires skilled masonry crew to avoid block alignment shifts',
        'Not recommended for load-bearing structures without RCC frame columns'
      ],
      carbonReduction: 'Reduces structural carbon footprint by 28% (flyash blended mix)',
      timeReduction: 'Cuts wall construction schedule by 35% due to larger brick format size'
    })
  }

  // Check steel reinforcement weight
  const steelWeight = m.steel_weight || 0
  if (steelWeight > 2000) {
    recs.push({
      id: 'rec_steel_grade',
      title: 'Optimize Steel Grade to High-Strength Fe550D / Fe600',
      description: 'Upgrading rebar grade from Fe500 to Fe550D or Fe600 allows reduction of overall steel volume weight without sacrificing design shear or tensile capacity.',
      impact: 'medium',
      savings_est: 8,
      category: 'material',
      actionableText: 'Set Steel grade parameter to Fe550D or higher.',
      advantages: [
        'Saves 8-12% of total reinforcement weight',
        'Reduces rebar congestion in beam-column junctions',
        'Lower transportation and logistics cargo weights'
      ],
      disadvantages: [
        'Fe600 is slightly harder to bend manually on site',
        'Requires strict supervision of bar bending schedule'
      ],
      carbonReduction: 'Reduces raw iron processing carbon intensity by 10%',
      timeReduction: 'Saves 5% on manual bar bending and placement hours'
    })
  }

  // PPC Fly Ash Cement Suggestion
  recs.push({
    id: 'rec_fly_ash_cement',
    title: 'Utilize Fly Ash Blended PPC Cement for Masonry & Plasters',
    description: 'Using Portland Pozzolana Cement (PPC) instead of standard OPC 53 cement for non-structural masonry mortar and plaster coats yields cost savings and higher long-term durability.',
    impact: 'medium',
    savings_est: 6,
    category: 'sustainability',
    actionableText: 'Select PPC cement brands (e.g. Ramco Supergrade / ACC Suraksha) for plastering.',
    advantages: [
      'PPC cement is ₹20-40 cheaper per bag than OPC 53',
      'Higher resistance to sulphate attack and wet-area cracking',
      'Provides smoother finishing surface with reduced heat of hydration shrinkage cracks'
    ],
    disadvantages: [
      'Slightly slower initial setting time (requires extra curing days)',
      'Not recommended for high-grade RCC structural beam casting'
    ],
    carbonReduction: '30% carbon offset by replacing clinker with recycled thermal flyash',
    timeReduction: 'Requires 2 extra days of structural curing before formwork removal'
  })

  // Plumbing Shaft layout recommendation
  recs.push({
    id: 'rec_plumbing_shaft',
    title: 'Consolidate Back-to-Back Wet Area Plumbing Shafts',
    description: 'Aligning bathrooms and kitchen utilities back-to-back or vertically stacked minimizes piping lengths and minimizes wall core punctures.',
    impact: 'medium',
    savings_est: 10,
    category: 'design',
    actionableText: 'Review room layout to stack kitchen and washroom plumbing lines.',
    advantages: [
      'Reduces total plumbing piping lengths by 15-20%',
      'Cuts wall core puncturing charges and plumbing labor installation hours',
      'Significantly lowers risk of long-term dampness or leakage'
    ],
    disadvantages: [
      'Slightly restricts room arrangement layout versatility'
    ],
    carbonReduction: 'Reduces plastic PVC polymer pipe consumption',
    timeReduction: 'Speeds up plumbing piping installation schedule by 18%'
  })

  return recs
}
