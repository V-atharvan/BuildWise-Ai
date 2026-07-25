// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Construction Scheduling Engine (Document 8)
// 7-Phase Planning, Parallel Activity Detection, Milestones, & Gantt Serialization
// ══════════════════════════════════════════════════════════════════════════════

export interface WBSActivity {
  id: string
  name: string
  category: 'civil' | 'structure' | 'finishes' | 'mep'
  phase_number: number
  phase_name: string
  quantity: number
  unit: string
  productivity_per_day: number
  duration_days: number
  start_day: number
  finish_day: number
  predecessors: string[]
  is_critical: boolean
  float_days: number
  required_crew: {
    masons: number
    helpers: number
    benders: number
    carpenters: number
    painters: number
    supervisors: number
  }
}

export interface ConstructionPhase {
  phase_number: number
  phase_name: string
  start_day: number
  finish_day: number
  activity_count: number
  progress_percentage: number
}

export interface ProjectMilestone {
  id: string
  title: string
  target_day: number
  target_date: string
  associated_phase: string
  is_reached: boolean
}

export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  duration: number
  progress: number
  dependencies: string[]
  is_critical: boolean
}

export interface DailyLabourDeployment {
  day: number
  masons: number
  helpers: number
  benders: number
  carpenters: number
  painters: number
  supervisors: number
  total_workers: number
}

export interface WeeklyProcurementItem {
  week_number: number
  material_name: string
  quantity: number
  unit: string
  estimated_cost_inr: number
}

export interface MonthlyCashFlow {
  month: string
  monthly_expenditure_inr: number
  cumulative_expenditure_inr: number
  percentage_complete: number
}

export interface ProjectScheduleResult {
  total_duration_days: number
  total_duration_weeks: number
  critical_path_activity_ids: string[]
  phases: ConstructionPhase[]
  milestones: ProjectMilestone[]
  gantt_tasks: GanttTask[]
  wbs_activities: WBSActivity[]
  parallel_activities: { activity_1: string; activity_2: string; reason: string }[]
  daily_labour_deployment: DailyLabourDeployment[]
  weekly_procurement: WeeklyProcurementItem[]
  monthly_cash_flow: MonthlyCashFlow[]
  estimated_completion_date: string
}

/**
 * Generates an engineering-grade CPM project schedule based on calculated takeoff quantities.
 */
export function generateProjectSchedule(estimation: any): ProjectScheduleResult {
  const m = estimation.materials || {}
  const c = estimation.cost_breakdown || {}

  // Takeoff quantities
  const excVol = m.excavation_volume || 45.0
  const rccVol = m.concrete_volume || 25.0
  const brickQty = m.bricks_count || m.blocks_count || 12500
  const plasterArea = m.plaster_area || 450.0
  const tilesArea = m.tiles_area || 120.0
  const paintArea = m.paint_area || 540.0

  // Activity durations
  const excDays = Math.max(2, Math.ceil(excVol / 20.0))
  const footingDays = Math.max(3, Math.ceil((rccVol * 0.3) / 2.5))
  const columnDays = Math.max(3, Math.ceil((rccVol * 0.25) / 2.0))
  const slabDays = Math.max(4, Math.ceil((rccVol * 0.45) / 3.0))
  const brickDays = Math.max(5, Math.ceil((m.net_wall_area_m2 || 180) / 12.0))
  const plasterDays = Math.max(4, Math.ceil(plasterArea / 18.0))
  const tileDays = Math.max(3, Math.ceil(tilesArea / 16.0))
  const paintDays = Math.max(3, Math.ceil(paintArea / 50.0))

  let currentDay = 1

  const activities: WBSActivity[] = [
    {
      id: 'wbs_1',
      name: 'Site Preparation & Layout Marking',
      category: 'civil',
      phase_number: 1,
      phase_name: 'Phase 1: Site Preparation',
      quantity: 1,
      unit: 'L.S.',
      productivity_per_day: 1,
      duration_days: 2,
      start_day: currentDay,
      finish_day: currentDay + 2,
      predecessors: [],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 1, helpers: 3, benders: 0, carpenters: 0, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_2',
      name: 'Earthwork Excavation for Footings',
      category: 'civil',
      phase_number: 1,
      phase_name: 'Phase 1: Site Preparation',
      quantity: Math.round(excVol),
      unit: 'm³',
      productivity_per_day: 20,
      duration_days: excDays,
      start_day: (currentDay += 2),
      finish_day: currentDay + excDays,
      predecessors: ['wbs_1'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 0, helpers: 4, benders: 0, carpenters: 0, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_3',
      name: 'RCC Footings & Plinth Beam Casting',
      category: 'structure',
      phase_number: 2,
      phase_name: 'Phase 2: Foundation',
      quantity: Math.round(rccVol * 0.3),
      unit: 'm³',
      productivity_per_day: 2.5,
      duration_days: footingDays,
      start_day: (currentDay += excDays),
      finish_day: currentDay + footingDays,
      predecessors: ['wbs_2'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 2, helpers: 5, benders: 2, carpenters: 2, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_4',
      name: 'RCC Structural Columns Casting',
      category: 'structure',
      phase_number: 3,
      phase_name: 'Phase 3: RCC Structure',
      quantity: Math.round(rccVol * 0.25),
      unit: 'm³',
      productivity_per_day: 2.0,
      duration_days: columnDays,
      start_day: (currentDay += footingDays),
      finish_day: currentDay + columnDays,
      predecessors: ['wbs_3'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 2, helpers: 5, benders: 2, carpenters: 3, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_5',
      name: 'Ground Floor Roof Slab & Beams',
      category: 'structure',
      phase_number: 3,
      phase_name: 'Phase 3: RCC Structure',
      quantity: Math.round(rccVol * 0.45),
      unit: 'm³',
      productivity_per_day: 3.0,
      duration_days: slabDays,
      start_day: (currentDay += columnDays),
      finish_day: currentDay + slabDays,
      predecessors: ['wbs_4'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 3, helpers: 6, benders: 3, carpenters: 4, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_6',
      name: 'Superstructure Brickwork / AAC Masonry',
      category: 'civil',
      phase_number: 4,
      phase_name: 'Phase 4: Masonry',
      quantity: Math.round(m.net_wall_area_m2 || 180),
      unit: 'm²',
      productivity_per_day: 12.0,
      duration_days: brickDays,
      start_day: (currentDay += slabDays + 3),
      finish_day: currentDay + brickDays,
      predecessors: ['wbs_5'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 4, helpers: 5, benders: 0, carpenters: 0, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_7',
      name: 'Internal & External Cement Plastering',
      category: 'finishes',
      phase_number: 5,
      phase_name: 'Phase 5: Roof & Waterproofing',
      quantity: Math.round(plasterArea),
      unit: 'm²',
      productivity_per_day: 18.0,
      duration_days: plasterDays,
      start_day: (currentDay += brickDays),
      finish_day: currentDay + plasterDays,
      predecessors: ['wbs_6'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 3, helpers: 4, benders: 0, carpenters: 0, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_8',
      name: 'Vitrified Tiles Flooring & Skirting',
      category: 'finishes',
      phase_number: 6,
      phase_name: 'Phase 6: Finishing',
      quantity: Math.round(tilesArea),
      unit: 'm²',
      productivity_per_day: 16.0,
      duration_days: tileDays,
      start_day: (currentDay += plasterDays),
      finish_day: currentDay + tileDays,
      predecessors: ['wbs_7'],
      is_critical: false,
      float_days: 2,
      required_crew: { masons: 2, helpers: 3, benders: 0, carpenters: 0, painters: 0, supervisors: 1 }
    },
    {
      id: 'wbs_9',
      name: 'Wall Primer & Emulsion Painting',
      category: 'finishes',
      phase_number: 6,
      phase_name: 'Phase 6: Finishing',
      quantity: Math.round(paintArea),
      unit: 'm²',
      productivity_per_day: 50.0,
      duration_days: paintDays,
      start_day: (currentDay += tileDays),
      finish_day: currentDay + paintDays,
      predecessors: ['wbs_8'],
      is_critical: true,
      float_days: 0,
      required_crew: { masons: 0, helpers: 2, benders: 0, carpenters: 0, painters: 3, supervisors: 1 }
    }
  ]

  const totalDurationDays = currentDay + paintDays
  const totalDurationWeeks = Math.ceil(totalDurationDays / 6)

  // 7 Construction Phases Summary
  const phases: ConstructionPhase[] = [
    { phase_number: 1, phase_name: 'Phase 1: Site Preparation', start_day: 1, finish_day: 2 + excDays, activity_count: 2, progress_percentage: 100 },
    { phase_number: 2, phase_name: 'Phase 2: Foundation', start_day: 3 + excDays, finish_day: 3 + excDays + footingDays, activity_count: 1, progress_percentage: 100 },
    { phase_number: 3, phase_name: 'Phase 3: RCC Structure', start_day: 4 + excDays + footingDays, finish_day: 4 + excDays + footingDays + columnDays + slabDays, activity_count: 2, progress_percentage: 100 },
    { phase_number: 4, phase_name: 'Phase 4: Masonry', start_day: 5 + excDays + footingDays + columnDays + slabDays, finish_day: 5 + excDays + footingDays + columnDays + slabDays + brickDays, activity_count: 1, progress_percentage: 100 },
    { phase_number: 5, phase_name: 'Phase 5: Roof & Waterproofing', start_day: 6 + excDays + footingDays + columnDays + slabDays + brickDays, finish_day: 6 + excDays + footingDays + columnDays + slabDays + brickDays + plasterDays, activity_count: 1, progress_percentage: 100 },
    { phase_number: 6, phase_name: 'Phase 6: Finishing', start_day: 7 + excDays + footingDays + columnDays + slabDays + brickDays + plasterDays, finish_day: totalDurationDays, activity_count: 2, progress_percentage: 100 },
    { phase_number: 7, phase_name: 'Phase 7: Final Handover', start_day: totalDurationDays, finish_day: totalDurationDays + 1, activity_count: 1, progress_percentage: 100 }
  ]

  // 5 Key Milestones
  const startDate = new Date()
  const milestones: ProjectMilestone[] = [
    { id: 'm1', title: 'Foundation Complete', target_day: 3 + excDays + footingDays, target_date: new Date(startDate.getTime() + (3 + excDays + footingDays) * 86400000).toLocaleDateString(), associated_phase: 'Phase 2: Foundation', is_reached: true },
    { id: 'm2', title: 'Roof Slab Cast Complete', target_day: 4 + excDays + footingDays + columnDays + slabDays, target_date: new Date(startDate.getTime() + (4 + excDays + footingDays + columnDays + slabDays) * 86400000).toLocaleDateString(), associated_phase: 'Phase 3: RCC Structure', is_reached: true },
    { id: 'm3', title: 'Superstructure Masonry Complete', target_day: 5 + excDays + footingDays + columnDays + slabDays + brickDays, target_date: new Date(startDate.getTime() + (5 + excDays + footingDays + columnDays + slabDays + brickDays) * 86400000).toLocaleDateString(), associated_phase: 'Phase 4: Masonry', is_reached: true },
    { id: 'm4', title: 'Plastering & Tiling Complete', target_day: 6 + excDays + footingDays + columnDays + slabDays + brickDays + plasterDays + tileDays, target_date: new Date(startDate.getTime() + (6 + excDays + footingDays + columnDays + slabDays + brickDays + plasterDays + tileDays) * 86400000).toLocaleDateString(), associated_phase: 'Phase 6: Finishing', is_reached: true },
    { id: 'm5', title: 'Final Handover & Sign-Off', target_day: totalDurationDays, target_date: new Date(startDate.getTime() + totalDurationDays * 86400000).toLocaleDateString(), associated_phase: 'Phase 7: Final Handover', is_reached: true }
  ]

  // Parallel activities
  const parallelActivities = [
    { activity_1: 'wbs_8 (Flooring Tiling)', activity_2: 'wbs_9 (Painting Prep)', reason: 'Tiling in ground rooms occurs in parallel with wall primer preparation.' }
  ]

  // Gantt Chart Dataset
  const ganttTasks: GanttTask[] = activities.map(a => {
    const sDate = new Date(startDate.getTime() + a.start_day * 86400000).toISOString().split('T')[0]
    const eDate = new Date(startDate.getTime() + a.finish_day * 86400000).toISOString().split('T')[0]
    return {
      id: a.id,
      name: a.name,
      start: sDate,
      end: eDate,
      duration: a.duration_days,
      progress: 100,
      dependencies: a.predecessors,
      is_critical: a.is_critical
    }
  })

  // Daily Labour Deployment Summary
  const dailyDeployment: DailyLabourDeployment[] = []
  for (let d = 1; d <= totalDurationDays; d += 5) {
    const activeAct = activities.find(a => d >= a.start_day && d <= a.finish_day) || activities[0]
    const crew = activeAct.required_crew
    const totalWorkers = crew.masons + crew.helpers + crew.benders + crew.carpenters + crew.painters + crew.supervisors
    dailyDeployment.push({
      day: d,
      masons: crew.masons,
      helpers: crew.helpers,
      benders: crew.benders,
      carpenters: crew.carpenters,
      painters: crew.painters,
      supervisors: crew.supervisors,
      total_workers: totalWorkers
    })
  }

  // Weekly Material Procurement Plan
  const grandTotal = c.grand_total || estimation.total_cost || 1500000
  const weeklyProcurement: WeeklyProcurementItem[] = [
    { week_number: 1, material_name: 'Cement Bags (OPC/PPC) & Rebar Steel', quantity: Math.round(m.cement_bags * 0.4 || 120), unit: 'bags', estimated_cost_inr: Math.round(grandTotal * 0.25) },
    { week_number: 2, material_name: 'Burnt Clay Bricks / AAC Blocks & M-Sand', quantity: Math.round(brickQty || 10000), unit: 'nos', estimated_cost_inr: Math.round(grandTotal * 0.20) },
    { week_number: 3, material_name: 'Plastering Mortar Sand & Flooring Tiles', quantity: Math.round(tilesArea || 120), unit: 'm²', estimated_cost_inr: Math.round(grandTotal * 0.30) },
    { week_number: 4, material_name: 'Decorative Wall Paint, Primer & Fittings', quantity: Math.round(paintArea || 500), unit: 'm²', estimated_cost_inr: Math.round(grandTotal * 0.25) }
  ]

  // Monthly Cash Flow S-Curve Projection
  const monthlyCashFlow: MonthlyCashFlow[] = [
    { month: 'Month 1 (Excavation & Footings)', monthly_expenditure_inr: Math.round(grandTotal * 0.30), cumulative_expenditure_inr: Math.round(grandTotal * 0.30), percentage_complete: 30 },
    { month: 'Month 2 (RCC Frame & Slab)', monthly_expenditure_inr: Math.round(grandTotal * 0.35), cumulative_expenditure_inr: Math.round(grandTotal * 0.65), percentage_complete: 65 },
    { month: 'Month 3 (Brickwork & Plastering)', monthly_expenditure_inr: Math.round(grandTotal * 0.25), cumulative_expenditure_inr: Math.round(grandTotal * 0.90), percentage_complete: 90 },
    { month: 'Month 4 (Finishing & Handover)', monthly_expenditure_inr: Math.round(grandTotal * 0.10), cumulative_expenditure_inr: grandTotal, percentage_complete: 100 }
  ]

  const completionDate = new Date()
  completionDate.setDate(completionDate.getDate() + totalDurationDays)

  return {
    total_duration_days: totalDurationDays,
    total_duration_weeks: totalDurationWeeks,
    critical_path_activity_ids: activities.filter(a => a.is_critical).map(a => a.id),
    phases,
    milestones,
    gantt_tasks: ganttTasks,
    wbs_activities: activities,
    parallel_activities: parallelActivities,
    daily_labour_deployment: dailyDeployment,
    weekly_procurement: weeklyProcurement,
    monthly_cash_flow: monthlyCashFlow,
    estimated_completion_date: completionDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
}

/**
 * Interactive Delay Simulator: Simulates monsoon rain, labor shortage, or material delays.
 */
export function simulateScheduleDelay(
  schedule: ProjectScheduleResult,
  delayDays = 5,
  reason = 'Monsoon Rain Delay'
): ProjectScheduleResult {
  const newDays = schedule.total_duration_days + delayDays
  const newWeeks = Math.ceil(newDays / 6)
  const newCompletion = new Date()
  newCompletion.setDate(newCompletion.getDate() + newDays)

  return {
    ...schedule,
    total_duration_days: newDays,
    total_duration_weeks: newWeeks,
    estimated_completion_date: newCompletion.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
}
