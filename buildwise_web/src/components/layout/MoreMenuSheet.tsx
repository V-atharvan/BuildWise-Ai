'use client'

import Link from 'next/link'
import {
  X, Sparkles, Calculator, FileText, Box, Settings, User, Shield, HelpCircle, HardDrive
} from 'lucide-react'

interface MoreMenuSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function MoreMenuSheet({ isOpen, onClose }: MoreMenuSheetProps) {
  if (!isOpen) return null

  const categories = [
    {
      title: 'ANALYSIS',
      items: [
        { label: 'AI Floor Plan Analysis', href: '/upload', icon: Sparkles, color: 'text-violet-500' },
        { label: 'Validation & Confidence', href: '/projects', icon: Shield, color: 'text-emerald-500' },
      ],
    },
    {
      title: 'ESTIMATION',
      items: [
        { label: 'BOQ Estimates', href: '/reports', icon: Calculator, color: 'text-amber-500' },
        { label: 'Calculation Audit', href: '/reports', icon: FileText, color: 'text-blue-500' },
      ],
    },
    {
      title: 'REPORTS & EXPORT',
      items: [
        { label: 'Saved Reports (PDF / Excel)', href: '/reports', icon: FileText, color: 'text-purple-500' },
      ],
    },
    {
      title: 'VIEW',
      items: [
        { label: '3D Building Viewer', href: '/projects', icon: Box, color: 'text-sky-500' },
      ],
    },
    {
      title: 'PROJECT & SYSTEM',
      items: [
        { label: 'Profile', href: '/profile', icon: User, color: 'text-gray-400' },
        { label: 'Project Settings', href: '/settings', icon: Settings, color: 'text-gray-400' },
        { label: 'Storage & Offline Sync', href: '/settings', icon: HardDrive, color: 'text-emerald-400' },
      ],
    },
  ]

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="More Menu">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet Drawer Container */}
      <div className="relative z-10 w-full bg-white dark:bg-[#1E1E24] rounded-t-[28px] border-t border-black/[0.1] dark:border-white/[0.1] shadow-2xl p-5 max-h-[82vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200">
        
        {/* Header Handle & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">BuildWise AI Tools</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white rounded-xl bg-black/[0.04] dark:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categorized Options */}
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-1.5">
              <p className="text-[10px] font-bold text-black/40 dark:text-white/30 uppercase tracking-widest px-1">
                {cat.title}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {cat.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[13px] font-medium text-black/80 dark:text-white/80 transition-all active:scale-[0.99]"
                  >
                    <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
