// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Image Storage (IndexedDB + Global Memory Fallback)
// Bypasses 5MB browser localStorage QuotaExceededError
// ══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'BuildWiseImageDB'
const STORE_NAME = 'floor_plan_images'
const RECORDS_STORE = 'floor_plan_records'
const DB_VERSION = 2

// Memory fallback cache in window
const memoryCache: Record<string, string> = {}
const memoryPlanCache: Record<string, any> = {}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE)
      }
    }
  })
}

export async function savePlanImageDataUrl(planId: string, dataUrl: string): Promise<void> {
  memoryCache[planId] = dataUrl
  if (typeof window !== 'undefined') {
    (window as any).__BW_LAST_UPLOADED_IMAGE__ = dataUrl
  }

  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(dataUrl, planId)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    // Fallback to localStorage with compression if IndexedDB fails
    try {
      localStorage.setItem(`bw_demo_file_data_${planId}`, dataUrl.substring(0, 1000000))
    } catch { /* ignore */ }
  }
}

export async function getPlanImageDataUrl(planId: string): Promise<string | null> {
  // 1. Check memory cache first
  if (memoryCache[planId]) return memoryCache[planId]
  if (typeof window !== 'undefined' && (window as any).__BW_LAST_UPLOADED_IMAGE__) {
    return (window as any).__BW_LAST_UPLOADED_IMAGE__
  }

  // 2. Check IndexedDB
  try {
    const db = await openDB()
    const dataUrl = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(planId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
    if (dataUrl) {
      memoryCache[planId] = dataUrl
      return dataUrl
    }
  } catch { /* ignore */ }

  // 3. Check localStorage fallback
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`bw_demo_file_data_${planId}`)
  }
  return null
}

export async function savePlanRecord(planId: string, projectId: string, record: any): Promise<void> {
  if (planId) memoryPlanCache[planId] = record
  if (projectId) memoryPlanCache[projectId] = record
  if (typeof window !== 'undefined') {
    (window as any).__BW_LAST_PLAN_RECORD__ = record
  }

  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(RECORDS_STORE, 'readwrite')
      const store = tx.objectStore(RECORDS_STORE)
      if (planId) store.put(record, planId)
      if (projectId && projectId !== planId) store.put(record, projectId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch { /* ignore */ }
}

export async function getPlanRecord(id: string): Promise<any | null> {
  if (!id) return null

  // 1. Memory cache
  if (memoryPlanCache[id]) return memoryPlanCache[id]
  if (typeof window !== 'undefined' && (window as any).__BW_LAST_PLAN_RECORD__) {
    const last = (window as any).__BW_LAST_PLAN_RECORD__
    if (last.id === id || last.project_id === id) return last
  }

  // 2. IndexedDB
  try {
    const db = await openDB()
    const record = await new Promise<any | null>((resolve) => {
      const tx = db.transaction(RECORDS_STORE, 'readonly')
      const store = tx.objectStore(RECORDS_STORE)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
    if (record) {
      memoryPlanCache[id] = record
      return record
    }
  } catch { /* ignore */ }

  // 3. localStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('bw_demo_plan_'))
      for (const k of allKeys) {
        const item = JSON.parse(localStorage.getItem(k) || '{}')
        if (item.id === id || item.project_id === id) {
          memoryPlanCache[id] = item
          return item
        }
      }
      // If latest exists
      if (allKeys.length > 0) {
        const latestKey = allKeys[allKeys.length - 1]
        const item = JSON.parse(localStorage.getItem(latestKey) || '{}')
        if (item.detected_data?.rooms?.length > 0) return item
      }
    } catch { /* ignore */ }
  }

  return null
}
