'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { getUser, logout } from '@/lib/auth'
import {
  LayoutDashboard, FolderOpen, Upload, FileText, MessageSquare,
  User, Settings, Shield, ChevronRight, Sun, Moon, Hexagon,
  Bell, LogOut, Package, Map, Box, Lightbulb, Sparkles, FileSpreadsheet, X
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Upload Drawing', href: '/upload', icon: Upload },
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
    <aside className="flex flex-col h-full w-full bg-white dark:bg-[#1E1E24] border-r border-black/[0.06] dark:border-white/[0.06] text-gray-900 dark:text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-[60px] border-b border-black/[0.06] dark:border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Hexagon className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-black tracking-tight">
            BuildWise<span className="text-violet-400"> AI</span>
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="lg:hidden p-2 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-1">
            HOME
          </p>
          <Link
            href="/dashboard"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative',
              pathname.startsWith('/dashboard') || pathname === '/'
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>

        <div>
          <p className="text-[10px] font-bold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-1">
            PROJECT
          </p>
          <Link
            href="/projects"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative',
              pathname.startsWith('/projects')
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Projects</span>
          </Link>
        </div>

        <div>
          <p className="text-[10px] font-bold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-1">
            ANALYSIS & EDITOR
          </p>
          <Link
            href="/upload"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative',
              pathname.startsWith('/upload')
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <Upload className="w-4 h-4 text-violet-500" />
            <span>AI Floor Plan Analysis</span>
          </Link>
          <Link
            href="/chat"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative mt-0.5',
              pathname.startsWith('/chat')
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>AI Copilot Chat</span>
            <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full ml-auto">
              AI
            </span>
          </Link>
        </div>

        <div>
          <p className="text-[10px] font-bold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-1">
            REPORTS & BOQ
          </p>
          <Link
            href="/reports"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative',
              pathname.startsWith('/reports')
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            <span>BOQ & Reports</span>
          </Link>
        </div>

        <div>
          <p className="text-[10px] font-bold text-black/30 dark:text-white/25 uppercase tracking-widest px-2 pb-1">
            SETTINGS & ACCOUNT
          </p>
          <Link
            href="/profile"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative',
              pathname === '/profile'
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative mt-0.5',
              pathname === '/settings'
                ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Project Settings</span>
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all group relative mt-0.5',
                pathname === '/admin'
                  ? 'bg-violet-600/10 text-violet-500 dark:text-violet-400 font-semibold'
                  : 'text-black/60 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              )}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>
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
