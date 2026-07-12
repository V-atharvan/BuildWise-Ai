'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { getUser, logout } from '@/lib/auth'
import {
  LayoutDashboard, FolderOpen, Upload, FileText, MessageSquare,
  User, Settings, Shield, ChevronRight, Sun, Moon, Hexagon,
  Bell, LogOut,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'AI Chat', href: '/chat', icon: MessageSquare, badge: 'AI' },
]

const bottomItems = [
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const user = getUser()

  return (
    <aside className="flex flex-col h-full w-[240px] bg-white dark:bg-[#1E1E24] border-r border-black/[0.06] dark:border-white/[0.06] text-gray-900 dark:text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[60px] border-b border-black/[0.06] dark:border-white/[0.06] flex-shrink-0">
        <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Hexagon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[15px] font-black tracking-tight">
          BuildWise<span className="text-violet-400"> AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-2 pt-1">
          Main
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[13.5px] font-medium transition-all duration-150 group relative',
                active
                  ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400'
                  : 'text-black/50 dark:text-white/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-violet-600 rounded-r-full" />
              )}
              <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-violet-500' : '')} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        <p className="text-[10px] font-semibold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-2 pt-5">
          Account
        </p>
        {bottomItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[13.5px] font-medium transition-all duration-150 relative',
                active
                  ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400'
                  : 'text-black/50 dark:text-white/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-violet-600 rounded-r-full" />
              )}
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {user?.role === 'admin' && (
          <Link
            href="/admin"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[13.5px] font-medium transition-all duration-150 relative',
              pathname === '/admin'
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400'
                : 'text-black/50 dark:text-white/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80'
            )}
          >
            <Shield className="w-4 h-4" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[13.5px] font-medium text-black/50 dark:text-white/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80 transition-all border border-black/[0.06] dark:border-white/[0.08]"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-violet-500" />
          }
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold truncate">{user?.full_name ?? 'User'}</p>
            <p className="text-[11px] text-black/40 dark:text-white/30 truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={logout}
            className="text-black/30 dark:text-white/30 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
