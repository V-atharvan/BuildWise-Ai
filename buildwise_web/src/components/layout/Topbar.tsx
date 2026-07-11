'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Menu, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'

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
    <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-6 bg-white dark:bg-[#1E1E24] border-b border-black/[0.06] dark:border-white/[0.06] sticky top-0 z-30 text-gray-900 dark:text-white">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-[15px] font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick search */}
        <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-[13px] text-black/40 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors border border-black/[0.06] dark:border-white/[0.06] min-w-[180px]">
          <Search className="w-3.5 h-3.5" />
          Search...
          <kbd className="ml-auto text-[11px] bg-black/[0.06] dark:bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>

        {/* New project */}
        <Link
          href="/upload"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold transition-all shadow-lg shadow-violet-600/25"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Link>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
          <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
        </button>
      </div>
    </header>
  )
}
