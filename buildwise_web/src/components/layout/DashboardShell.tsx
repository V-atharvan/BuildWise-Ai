'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileBottomNavigation } from './MobileBottomNavigation'
import { MoreMenuSheet } from './MoreMenuSheet'
import { cn } from '@/lib/utils'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.replace('/login')
    }
  }, [router])

  // Lock body scrolling when mobile drawer or bottom sheet is open and support ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setMoreSheetOpen(false)
      }
    }

    if (sidebarOpen || moreSheetOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [sidebarOpen, moreSheetOpen])

  if (!mounted) return null
  if (!isAuthenticated()) return null

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#121212] text-gray-900 dark:text-white flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <div className="w-[240px] fixed inset-y-0 left-0 z-40">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-[280px] max-w-[85vw] shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* More Menu Bottom Sheet Overlay */}
      <MoreMenuSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[240px] overflow-x-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 lg:pb-6 max-w-[1400px] w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Items: Home | Projects | Floor Plan | BOQ | More) */}
      <MobileBottomNavigation onMoreClick={() => setMoreSheetOpen(true)} />
    </div>
  )
}
