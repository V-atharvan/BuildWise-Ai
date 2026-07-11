import { User } from './types'

const TOKEN_KEY = 'bw_access_token'
const USER_KEY = 'bw_user'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUser(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function logout(): void {
  removeToken()
  window.location.href = '/login'
}

// ── Demo / offline mock auth ──────────────────────────────────────────────────
// Stores user credentials in localStorage so the UI is fully testable
// without a running backend.

const DEMO_USERS_KEY = 'bw_demo_users'

interface DemoUserRecord {
  full_name: string
  email: string
  company?: string
  password: string
  role: string
  created_at: string
}

function getDemoUsers(): DemoUserRecord[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveDemoUsers(users: DemoUserRecord[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users))
}

export function demoRegister(params: {
  full_name: string
  email: string
  password: string
  company?: string
}): User {
  const users = getDemoUsers()
  if (users.find((u) => u.email === params.email)) {
    throw new Error('A user with this email already exists.')
  }
  const record: DemoUserRecord = {
    ...params,
    role: 'user',
    created_at: new Date().toISOString(),
  }
  saveDemoUsers([...users, record])

  const user: User = {
    id: `demo_${Date.now()}`,
    full_name: params.full_name,
    email: params.email,
    company: params.company,
    role: 'user',
    is_active: true,
    created_at: record.created_at,
  }
  return user
}

export function demoLogin(email: string, password: string): User {
  const users = getDemoUsers()
  const record = users.find((u) => u.email === email)
  if (!record || record.password !== password) {
    throw new Error('Invalid email or password.')
  }
  return {
    id: `demo_${email}`,
    full_name: record.full_name,
    email: record.email,
    company: record.company,
    role: record.role,
    is_active: true,
    created_at: record.created_at,
  }
}

export function isDemoMode(): boolean {
  // Returns true when API base URL is localhost (no real server expected)
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return base.includes('localhost') || base.includes('127.0.0.1')
}
