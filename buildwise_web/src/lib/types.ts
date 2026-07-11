// ── Shared TypeScript Types for BuildWise AI ──

export type Theme = 'dark' | 'light' | 'system'
export type Role = 'user' | 'admin'
export type ProjectStatus = 'draft' | 'analyzing' | 'completed' | 'failed'
export type BuildingType = 'house' | 'villa' | 'apartment' | 'commercial' | 'hospital' | 'warehouse' | 'school' | 'other'

// ── Auth ──
export interface User {
  id: string
  email: string
  full_name: string
  company?: string
  phone?: string
  avatar_url?: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  token_type: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  full_name: string
  email: string
  password: string
  company?: string
}

// ── Projects ──
export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  building_type: BuildingType
  status: ProjectStatus
  is_favorite: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  plans?: Plan[]
  estimations?: Estimation[]
}

export interface ProjectListResponse {
  items: Project[]
  total: number
}

export interface CreateProjectInput {
  name: string
  description?: string
  building_type: BuildingType
}

// ── Plans (uploaded drawings) ──
export interface Plan {
  id: string
  project_id: string
  filename: string
  file_type: string
  file_url: string
  file_size: number
  status: 'pending' | 'processing' | 'done' | 'failed'
  ai_result?: AIAnalysisResult
  created_at: string
}

export interface AIAnalysisResult {
  total_area?: number
  rooms?: DetectedRoom[]
  walls?: DetectedWall[]
  scale?: number
  confidence?: number
  missing_fields?: string[]
}

export interface DetectedRoom {
  label: string
  area: number
  perimeter: number
}

export interface DetectedWall {
  thickness: number
  length: number
  type: string
}

// ── Estimation ──
export interface Estimation {
  id: string
  project_id: string
  plan_id?: string
  user_inputs: UserEstimationInputs
  materials: MaterialResult
  cost_breakdown: CostBreakdown
  total_cost: number
  currency: string
  created_at: string
}

export interface UserEstimationInputs {
  building_type: BuildingType
  num_floors: number
  floor_height: number
  total_area: number
  wall_thickness: number
  slab_thickness: number
  concrete_grade: string
  steel_grade: string
  foundation_type: string
  roof_type: string
  brick_type: string
  waste_percentage: number
}

export interface MaterialResult {
  concrete_volume: number        // m³
  steel_weight: number           // kg
  cement_bags: number
  sand_volume: number            // m³
  aggregate_volume: number       // m³
  bricks_count: number
  blocks_count: number
  mortar_volume: number          // m³
  plaster_area: number           // m²
  paint_area: number             // m²
  tiles_area: number             // m²
  waterproofing_area: number     // m²
  excavation_volume: number      // m³
  formwork_area: number          // m²
  glass_area: number             // m²
  doors_count: number
  windows_count: number
}

export interface CostBreakdown {
  concrete_cost: number
  steel_cost: number
  cement_cost: number
  sand_cost: number
  aggregate_cost: number
  brick_cost: number
  block_cost: number
  mortar_cost: number
  plaster_cost: number
  paint_cost: number
  tiles_cost: number
  waterproofing_cost: number
  excavation_cost: number
  labour_cost: number
  equipment_cost: number
  total_material_cost: number
  gst_amount: number
  contractor_margin: number
  contingency: number
  grand_total: number
}

// ── Reports ──
export interface Report {
  id: string
  project_id: string
  estimation_id: string
  title: string
  file_url?: string
  created_at: string
}

// ── Chat ──
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ── Admin ──
export interface AdminStats {
  total_users: number
  total_projects: number
  total_estimates: number
  total_reports: number
  active_today: number
  new_this_week: number
}

// ── Dashboard ──
export interface DashboardStats {
  total_projects: number
  completed_estimates: number
  today_estimates: number
  saved_reports: number
}

// ── Notifications ──
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

// ── API Error ──
export interface APIError {
  detail: string | { msg: string; type: string }[]
  status_code?: number
}
