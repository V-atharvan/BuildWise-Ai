'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/upload': 'Upload Drawing',
  '/reports': 'Reports',
  '/chat': 'AI Assistant',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
}

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  
  let pageTitle = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'BuildWise AI'
  let activeProjectName = ''

  if (pathname.startsWith('/projects/')) {
    const parts = pathname.split('/')
    const projId = parts[2]
    if (projId) {
      try {
        const stored = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
        const proj = stored.find((p: any) => p.id === projId)
        if (proj?.name) {
          activeProjectName = proj.name
        }
      } catch { /* ignore */ }
    }
  }

  return (
    <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-3 sm:px-6 bg-white dark:bg-[#1E1E24] border-b border-black/[0.06] dark:border-white/[0.06] sticky top-0 z-30 text-gray-900 dark:text-white">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open BuildWise navigation drawer"
          className="lg:hidden p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.04] active:bg-black/[0.08] transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-800 dark:text-gray-200" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[13.5px] sm:text-[15px] font-bold truncate max-w-[200px] sm:max-w-[360px]">
            {activeProjectName ? activeProjectName : pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10.5px] sm:text-[11px] font-semibold border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ✓ Saved
        </span>
      </div>
    </header>
  )
}
