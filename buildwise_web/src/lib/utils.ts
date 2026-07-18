import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const BUILDING_TYPES = [
  { value: 'house', label: 'Residential House' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Apartment Building' },
  { value: 'commercial', label: 'Commercial Building' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
] as const

export const CONCRETE_GRADES = ['M15', 'M20', 'M25', 'M30', 'M35', 'M40'] as const
export const STEEL_GRADES = ['Fe415', 'Fe500', 'Fe500D', 'Fe550', 'Fe550D'] as const
export const FOUNDATION_TYPES = ['isolated', 'combined', 'strip', 'raft', 'pile'] as const
export const ROOF_TYPES = ['flat_rcc', 'sloped_rcc', 'truss', 'puf_panel'] as const
export const BRICK_TYPES = ['red_brick', 'fly_ash', 'aac_block', 'concrete_block'] as const

export function trackReportOpen(report: any): void {
  if (typeof window === 'undefined') return
  try {
    const opened = JSON.parse(localStorage.getItem('bw_recently_opened_reports') || '[]')
    const filtered = opened.filter((r: any) => r.id !== report.id)
    filtered.unshift(report)
    localStorage.setItem('bw_recently_opened_reports', JSON.stringify(filtered.slice(0, 5)))
  } catch { /* ignore */ }
}

export function getRecentlyOpenedReports(): any[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('bw_recently_opened_reports') || '[]')
  } catch { return [] }
}
