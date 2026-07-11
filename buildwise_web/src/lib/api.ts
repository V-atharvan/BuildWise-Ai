import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request interceptor: attach JWT ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bw_access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ── Response interceptor: handle 401 ──
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bw_access_token')
        localStorage.removeItem('bw_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (data: { full_name: string; email: string; password: string; company?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
}

// ── Projects API ──
export const projectsApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; status?: string; building_type?: string; is_favorite?: boolean }) =>
    api.get('/projects/', { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string; building_type: string }) =>
    api.post('/projects/', data),
  update: (id: string, data: Partial<{ name: string; description: string; building_type: string; is_favorite: boolean; is_archived: boolean }>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  duplicate: (id: string) => api.post(`/projects/${id}/duplicate`),
}

// ── Upload API ──
export const uploadApi = {
  upload: (projectId: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    form.append('project_id', projectId)
    return api.post('/upload/plan', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
  },
  getStatus: (planId: string) => api.get(`/upload/status/${planId}`),
}

// ── AI Analysis API ──
export const aiApi = {
  analyze: (planId: string) => api.post('/ai/analyze', { plan_id: planId }),
  status: (planId: string) => api.get(`/ai/status/${planId}`),
  chat: (message: string, projectId?: string) =>
    api.post('/ai/chat', { message, project_id: projectId }),
}

// ── Estimation API ──
export const estimationApi = {
  create: (projectId: string, inputs: Record<string, unknown>) =>
    api.post('/estimation/calculate', { project_id: projectId, user_inputs: inputs }),
  get: (estimationId: string) => api.get(`/estimation/${estimationId}`),
  list: (projectId: string) => api.get(`/estimation/`, { params: { project_id: projectId } }),
}

// ── Reports API ──
export const reportsApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get('/reports/', { params }),
  get: (id: string) => api.get(`/reports/${id}`),
  generate: (estimationId: string) => api.post('/reports/generate', { estimation_id: estimationId }),
  download: (id: string) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
}

// ── Profile API ──
export const profileApi = {
  get: () => api.get('/auth/me'),
  update: (data: Partial<{ full_name: string; company: string; phone: string }>) =>
    api.patch('/auth/me', data),
  changePassword: (current: string, newPass: string) =>
    api.post('/auth/change-password', { current_password: current, new_password: newPass }),
}

// ── Admin API ──
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  updateUserRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
  deactivateUser: (userId: string) => api.patch(`/admin/users/${userId}/deactivate`),
}

// ── Dashboard API ──
export const dashboardApi = {
  getStats: () => api.get('/projects/stats'),
}
