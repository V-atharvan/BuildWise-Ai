'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, Square, FileSpreadsheet, MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBottomNavigationProps {
  onMoreClick: () => void
}

export function MobileBottomNavigation({ onMoreClick }: MobileBottomNavigationProps) {
  const pathname = usePathname()

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: LayoutDashboard,
      href: '/dashboard',
      isActive: pathname === '/' || pathname.startsWith('/dashboard'),
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      href: '/projects',
      isActive: pathname.startsWith('/projects'),
    },
    {
      id: 'floor_plan',
      label: 'Floor Plan',
      icon: Square,
      href: '/upload',
      isActive: pathname.startsWith('/upload') || pathname.includes('/floor-plans') || pathname.includes('/analysis'),
    },
    {
      id: 'boq',
      label: 'BOQ',
      icon: FileSpreadsheet,
      href: '/reports',
      isActive: pathname.startsWith('/reports') || pathname.includes('/boq') || pathname.includes('/estimate'),
    },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1E1E24]/95 backdrop-blur-lg border-t border-black/[0.08] dark:border-white/[0.08] px-2 py-1.5 flex items-center justify-around shadow-2xl min-h-[60px]"
      aria-label="Mobile Navigation Bar"
    >
      {navItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[54px] text-center select-none',
            item.isActive
              ? 'text-violet-600 dark:text-violet-400 font-bold scale-[1.03]'
              : 'text-black/45 dark:text-white/40 hover:text-black dark:hover:text-white font-medium'
          )}
        >
          <item.icon className={cn('w-5 h-5 mb-0.5 sm:w-5.5 sm:h-5.5', item.isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]')} />
          <span className="text-[10px] sm:text-[11px] tracking-tight truncate max-w-[64px]">
            {item.label}
          </span>
        </Link>
      ))}

      {/* 5th Destination: More Menu */}
      <button
        onClick={onMoreClick}
        type="button"
        className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[54px] text-center select-none text-black/45 dark:text-white/40 hover:text-black dark:hover:text-white font-medium"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5 sm:w-5.5 sm:h-5.5 stroke-[1.8px]" />
        <span className="text-[10px] sm:text-[11px] tracking-tight">More</span>
      </button>
    </nav>
  )
}
