export interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  savings_est: number // percentage or absolute
  category: 'material' | 'design' | 'logistics' | 'sustainability'
  actionableText: string
}

export function generateRecommendations(estimation: any): Recommendation[] {
  const m = estimation.materials || {}
  const c = estimation.cost_breakdown || estimation.cost || {}
  const recs: Recommendation[] = []

  // Check if brick is red brick, suggest AAC
  const isRedBrick = m.bricks_count > 0
  if (isRedBrick) {
    recs.push({
      id: 'rec_aac_blocks',
      title: 'Switch to AAC Blocks instead of Clay Bricks',
      description: 'AAC (Autoclaved Aerated Concrete) blocks are larger, lighter, and offer superior thermal insulation. They reduce mortar usage by 60% and speed up wall construction.',
      impact: 'high',
      savings_est: 15,
      category: 'material',
      actionableText: 'Change brick type to AAC Blocks in your Material Config.',
    })
  }

  // Check steel reinforcement weight
  const steelWeight = m.steel_weight || 0
  if (steelWeight > 3000) {
    recs.push({
      id: 'rec_steel_grade',
      title: 'Optimize Steel Grade to Fe550D / Fe600',
      description: 'Upgrading from Fe500 to Fe550D or Fe600 high-strength reinforcement bars allows reduction of overall steel volume requirements by 8-12% without sacrificing load capacity.',
      impact: 'medium',
      savings_est: 8,
      category: 'material',
      actionableText: 'Switch Steel Grade in configuration to Fe550 or higher.',
    })
  }

  // Sustainability carbon footprint suggestion
  recs.push({
    id: 'rec_fly_ash_cement',
    title: 'Utilize PPC (Fly Ash Blended) Cement for Masonry',
    description: 'Blended Portland Pozzolana Cement (PPC) uses recycled fly ash, reducing carbon footprint by 30% and providing higher long-term durability and resistance to wet-area cracking.',
    impact: 'medium',
    savings_est: 5,
    category: 'sustainability',
    actionableText: 'Configure Ramco PPC or ACC PPC Cement for mortar/plaster coats.',
  })

  // Plumbing layout recommendation
  recs.push({
    id: 'rec_plumbing_shaft',
    title: 'Consolidate wet area plumbing shafts',
    description: 'Aligning bathrooms and kitchen walls back-to-back or vertically stacked minimizes piping lengths, reduces wall puncture counts, and lowers risk of leakage.',
    impact: 'medium',
    savings_est: 10,
    category: 'design',
    actionableText: 'Group bathroom and utility water inlet lines into singular shafts.',
  })

  // Add default suggestions if empty
  if (recs.length === 0) {
    recs.push({
      id: 'rec_default_procure',
      title: 'Direct Brand Procurement',
      description: 'Procuring materials like cement and TMT steel directly from authorized distributors or wholesale traders rather than retail dealers yields a 5-8% discount.',
      impact: 'low',
      savings_est: 6,
      category: 'logistics',
      actionableText: 'Contact wholesale builders-merchants for bulk order price sheets.',
    })
  }

  return recs
}
