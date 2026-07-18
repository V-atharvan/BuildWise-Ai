'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Leaf, Coins, BadgePercent } from 'lucide-react'
import { generateRecommendations, type Recommendation } from '@/lib/recommendations'

export default function ProjectAISuggestionsTab() {
  const { id: projectId } = useParams() as { id: string }
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  
  useEffect(() => {
    if (!projectId) return

    // Load actual or fallback estimations
    const demoEst = localStorage.getItem(`bw_demo_est_${projectId}`) || 
                    Object.keys(localStorage)
                      .filter(k => k.startsWith('bw_demo_est_'))
                      .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
                      .find(est => est.project_id === projectId)

    const estimationData = demoEst ? (typeof demoEst === 'string' ? JSON.parse(demoEst) : demoEst) : {
      materials: { bricks_count: 14500, steel_weight: 3270, cement_bags: 340 },
      cost_breakdown: { grand_total: 1916350 }
    }

    setRecommendations(generateRecommendations(estimationData))
  }, [projectId])

  return (
    <div className="space-y-6 pt-4 pb-20">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500 fill-violet-500/20" />
          AI Value Engineering & Material Suggestions
        </h3>
        <p className="text-[13px] text-black/40 dark:text-white/35 mt-1">
          Automated optimization rules and eco-friendly substitutions derived from Indian IS Standards (IS 1200 / IS 456).
        </p>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const CategoryIcon = rec.category === 'sustainability' ? Leaf : Coins
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-violet-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/40 dark:text-white/30">
                      {rec.category}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rec.impact === 'high' ? 'bg-red-500/10 text-red-500' :
                    rec.impact === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {rec.impact.toUpperCase()} IMPACT
                  </span>
                </div>

                <h4 className="font-bold text-[14.5px] mb-2">{rec.title}</h4>
                <p className="text-[12.5px] text-black/50 dark:text-white/40 leading-relaxed mb-4">
                  {rec.description}
                </p>
              </div>

              <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-violet-500">
                  <BadgePercent className="w-4 h-4" />
                  <span>Est. Savings: ~{rec.savings_est}%</span>
                </div>
                <span className="text-[11px] font-semibold text-black/40 dark:text-white/30 flex items-center gap-1">
                  Actionable <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
