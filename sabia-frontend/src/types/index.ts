// Tipos de domínio — espelham o esquema SQL da spec

export type Role = 'gestor' | 'operador'
export type AccessLevel = 'public' | 'internal'
export type ArticleStatus = 'active' | 'draft' | 'archived'
export type ConversationSource = 'direct' | 'widget' | 'kb'
export type TransferStatus = 'transferred' | 'out_of_hours' | 'no_answer'
export type MessageRole = 'user' | 'assistant' | 'system'
export type Confidence = 'high' | 'low' | 'none'
export type LogLevel = 'info' | 'warning' | 'error' | 'critical'
export type AiProvider = 'gemini' | 'openai' | 'anthropic'

export interface ArticleSuggestion {
  id: number
  title: string
  content: string
  summary?: string
  category_id: number | null
  access_level: AccessLevel
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'cancelled'
  suggested_by: string
  review_notes?: string
  article_id?: number
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  category?: Category
  suggested_by_profile?: {
    full_name: string
  }
}

export interface Profile {
  id: string
  user_id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  color: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Article {
  id: number
  title: string
  slug: string
  content: string // markdown
  summary?: string
  category_id: number | null
  access_level: AccessLevel
  status: ArticleStatus
  views_count: number
  helpful_yes: number
  helpful_no: number
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
  category?: Category
  author?: Profile
}

export interface ArticleVersion {
  id: number
  article_id: number
  version: number
  content: string
  edited_by: string | null
  created_at: string
  editor?: Profile
}

export interface Conversation {
  id: string
  user_id: string | null
  user_name?: string
  session_id?: string
  source: ConversationSource
  access_level: AccessLevel
  title?: string
  is_closed: boolean
  closed_at?: string
  rating?: number
  transfer_status?: TransferStatus
  created_at: string
  updated_at: string
  messages?: Message[]
}

export interface Message {
  id: number
  conversation_id: string
  role: MessageRole
  content: string
  images?: string[]
  sources?: { article_id: number; title: string; similarity: number }[]
  has_images: boolean
  confidence?: number
  confidence_level?: Confidence
  created_at: string
}

export interface KnowledgeGap {
  id: number
  question: string
  conversation_id?: string
  session_id?: string
  source: ConversationSource
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  created_at: string
}

export interface WidgetSettings {
  welcome_message: string
  support_link: string
  support_start_time: string
  support_end_time: string
  support_phone: string
  teams_webhook_url: string
  out_of_hours_message: string
  teams_notify_transfer: boolean
  teams_notify_gap: boolean
  teams_notify_out_of_hours: boolean
  allowed_domains: string[]
  maintenance_mode: boolean
  maintenance_message: string
}

export interface BrandSettings {
  app_name: string
  logo_url?: string
  favicon_url?: string
  primary_color: string
  secondary_color: string
  font: 'Inter' | 'Roboto' | 'Open Sans'
}

export interface AiSettings {
  provider: AiProvider
  api_key: string
  model: string
  endpoint: string
  embedding_model?: string
  temperature: number
  max_tokens: number
  system_prompt: string
  chunk_size: number
  chunk_overlap: number
  rag_top_n: number
  confidence_threshold: number
  language: 'pt-BR' | 'en-US' | 'es'
}

export interface AuditLog {
  id: number
  user_id?: string
  user_name?: string
  action: string
  entity_type?: string
  entity_id?: string
  old_value?: unknown
  new_value?: unknown
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface SystemLog {
  id: number
  level: LogLevel
  context: string
  message: string
  payload?: unknown
  created_at: string
}

export interface RatingEntry {
  id: string
  conversation_id: string
  user_name: string
  rating: number
  source: ConversationSource
  created_at: string
  title?: string
}

export interface HealthStatus {
  ai_provider: AiProvider
  ai_connected: boolean
  ai_requests_24h: number
  teams_webhook_configured: boolean
  teams_last_send?: string
  teams_last_status?: 'success' | 'failed'
  maintenance_mode: boolean
  recent_critical_errors: SystemLog[]
}
