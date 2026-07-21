'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Upload, FileText, AlertCircle, X, Loader2, ArrowRight, Plus, Folder
} from 'lucide-react'
import { projectsApi } from '@/lib/api'

// ── Demo projects stored in localStorage ──────────────────────────────────────
const DEMO_PROJECTS_KEY = 'bw_demo_projects'

interface DemoProject {
  id: string
  name: string
  building_type: string
  status: string
  created_at: string
  updated_at: string
}

function getDemoProjects(): DemoProject[] {
  if (typeof window !== 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(DEMO_PROJECTS_KEY) || '[]')
  } catch { return [] }
}

function saveDemoProjects(projects: DemoProject[]) {
  if (typeof window !== 'undefined') return
  localStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(projects))
}

function createDemoProject(name: string, buildingType: string): DemoProject {
  const p: DemoProject = {
    id: `demo_proj_${Date.now()}`,
    name,
    building_type: buildingType,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  saveDemoProjects([...getDemoProjects(), p])
  return p
}

// ── Simulate upload progress and redirect to analysis ─────────────────────────
function simulateUpload(
  projectId: string,
  fileName: string,
  onProgress: (pct: number) => void,
  onDone: (planId: string) => void
) {
  let pct = 0
  const tick = setInterval(() => {
    pct += Math.floor(Math.random() * 18) + 8
    if (pct >= 100) {
      pct = 100
      onProgress(100)
      clearInterval(tick)
      setTimeout(() => onDone(`demo_plan_${Date.now()}`), 400)
    } else {
      onProgress(pct)
    }
  }, 150)
}

function UploadContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('project_id')

  const [projectId, setProjectId] = useState(projectIdParam || '')
  const [demoProjects, setDemoProjects] = useState<DemoProject[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjType, setNewProjType] = useState('house')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load demo projects on mount
  useEffect(() => {
    setDemoProjects(getDemoProjects())
  }, [])

  // Try to load projects from backend; fall back to demo projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const backendProjects: any[] = projectsData?.items ?? []
  const allProjects = [
    ...backendProjects,
    ...demoProjects.filter((dp) => !backendProjects.find((bp) => bp.id === dp.id)),
  ]

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) validateAndSetFile(droppedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const validateAndSetFile = (f: File) => {
    setError('')
    const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'dwg', 'dxf']
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!allowedExts.includes(ext || '')) {
      setError('Invalid file type. Supported: PDF, PNG, JPG, JPEG, DWG, DXF')
      return
    }
    setFile(f)
  }

  const handleCreateProject = () => {
    if (!newProjName.trim()) return
    const p = createDemoProject(newProjName.trim(), newProjType)
    setDemoProjects(getDemoProjects())
    setProjectId(p.id)
    setShowNewProject(false)
    setNewProjName('')
  }

  const handleUpload = async () => {
    if (!file) { setError('Please select or drag a file to upload'); return }

    setIsUploading(true)
    setError('')

    // ── Auto-assign or auto-create a project if not chosen ─────────────────────
    let activeProjectId = projectId
    if (!activeProjectId) {
      const cleanName = file.name.split('.').slice(0, -1).join('.') || 'New Building Project'
      try {
        const res = await projectsApi.create({ name: cleanName, building_type: 'house' })
        activeProjectId = res.data.id
      } catch {
        const p = createDemoProject(cleanName, 'house')
        activeProjectId = p.id
      }
    }

    // Read file data URL upfront to ensure it's loaded before redirecting
    const readFileAsDataURL = (f: File): Promise<string> => {
      return new Promise((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = () => resolve('')
        r.readAsDataURL(f)
      })
    }
    const fileDataUrl = await readFileAsDataURL(file)

    // Try real API first; fall back to demo simulation
    try {
      const { uploadApi } = await import('@/lib/api')
      const res = await uploadApi.upload(activeProjectId, file, (pct) => setProgress(pct))
      router.push(`/analysis/${res.data.id}`)
    } catch {
      // Demo mode — simulate upload progress then go to analysis
      simulateUpload(
        activeProjectId,
        file.name,
        (pct) => setProgress(pct),
        (planId) => {
          if (fileDataUrl) {
            try {
              localStorage.setItem(`bw_demo_file_data_${planId}`, fileDataUrl)
            } catch { /* ignore */ }
          }

          // Store demo plan so analysis page can read it
          localStorage.setItem(`bw_demo_plan_${planId}`, JSON.stringify({
            id: planId,
            project_id: activeProjectId,
            filename: file.name,
            file_size: file.size,
            status: 'done',
            created_at: new Date().toISOString(),
          }))
          router.push(`/analysis/${planId}`)
        }
      )
    }
  }

  const buildingTypes = [
    { value: 'house', label: 'Residential House' },
    { value: 'apartment', label: 'Apartment Building' },
    { value: 'commercial', label: 'Commercial Building' },
    { value: 'villa', label: 'Villa / Bungalow' },
    { value: 'industrial', label: 'Industrial Warehouse' },
    { value: 'school', label: 'School / Institution' },
    { value: 'hospital', label: 'Hospital / Clinic' },
  ]

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Upload Drawing</h2>
        <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
          Upload blueprints to let our AI scan walls, doors, windows, and dimensions.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13.5px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-6">

        {/* Drag and Drop Zone FIRST */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-black/[0.08] dark:border-white/[0.08] hover:border-violet-500/30 rounded-2xl p-12 text-center cursor-pointer hover:bg-violet-600/[0.02] transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
              className="hidden"
            />
            <div className="w-14 h-14 bg-violet-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7 text-violet-600" />
            </div>
            <h3 className="font-bold text-[14.5px] mb-1">Drag & Drop building plan here</h3>
            <p className="text-[12.5px] text-black/40 dark:text-white/30">or click to browse from files</p>
            <p className="text-[11px] text-black/25 dark:text-white/20 mt-4">
              Supported: PDF, PNG, JPG, JPEG, DWG, DXF · Max 25MB
            </p>
          </div>
        ) : (
          <div className="border border-black/[0.07] dark:border-white/[0.07] bg-black/[0.01] dark:bg-white/[0.01] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold truncate max-w-[280px]">{file.name}</p>
                  <p className="text-[11.5px] text-black/35 dark:text-white/25">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  onClick={() => { setFile(null); setProgress(0) }}
                  className="p-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11.5px] font-medium text-black/40 dark:text-white/30">
                  <span>{progress < 100 ? 'Uploading drawing blueprint...' : 'Processing drawing...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 transition-all duration-150 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Project Selector (Presented Second, Optional/Auto-created) */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-6">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-black/60 dark:text-white/50">
              <Folder className="w-4 h-4 text-black/40 dark:text-white/30" />
              Assign to Project
            </label>

          {/* Inline create project form */}
          {showNewProject && !isUploading && (
            <div className="mb-3 p-4 rounded-2xl border border-violet-500/20 bg-violet-600/[0.02] space-y-3">
              <input
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="Project name (e.g. Shinde Residence G+2)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500"
              />
              <select
                value={newProjType}
                onChange={(e) => setNewProjType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500"
              >
                {buildingTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjName.trim()}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-all"
                >
                  Create & Select
                </button>
              </div>
            </div>
          )}

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={isUploading}
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[14px] focus:outline-none focus:border-violet-500 transition-all disabled:opacity-60"
          >
            <option value="">-- Auto-Create Project (from file name) --</option>
            {allProjects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.building_type})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-black/[0.06] dark:border-white/[0.06] pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isUploading}
            className="px-5 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] font-semibold hover:bg-black/[0.02] dark:hover:bg-white/[0.02] disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/25"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {progress < 100 ? 'Uploading...' : 'Analyzing...'}</>
            ) : (
              <>Upload & Analyze <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <UploadContent />
    </Suspense>
  )
}
