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
  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'BuildWise AI'

  return (
    <header className="h-[60px] flex-shrink-0 flex items-center px-6 bg-white dark:bg-[#1E1E24] border-b border-black/[0.06] dark:border-white/[0.06] sticky top-0 z-30 text-gray-900 dark:text-white">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 mr-3 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-[15px] font-bold">{title}</h1>
    </header>
  )
}
