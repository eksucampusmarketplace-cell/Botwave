/**
 * Shared types for BotWave API responses and data models.
 */

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Session Types ────────────────────────────────────────────────────────────

export type SessionState =
  | 'active'
  | 'inactive'
  | 'qr_pending'
  | 'pairing_sent'
  | 'needs_reauth';

export interface BotSession {
  id: string;
  user_id: string;
  phone_number: string;
  session_name: string;
  state: SessionState;
  last_active: string | null;
  created_at: string;
  updated_at: string;
  evolution_instance_id?: string;
  assigned_instance?: string;
  qr_code?: string;
  qr_generated_at?: string;
  pairing_code?: string;
  queue_position?: number | null;
}

// ─── Feature Types ────────────────────────────────────────────────────────────

export interface BotFeature {
  id: string;
  user_id: string;
  feature_key: string;
  feature_name: string;
  description: string;
  enabled: boolean;
  icon: string;
}

// ─── Stats Types ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalMessages: number;
  totalCommands: number;
  uptimePercent: number;
  activeSessions: number;
  totalSessions: number;
}

export interface AdminStats {
  totalUsers: number;
  activeSessions: number;
  totalSessions: number;
  needsReauthSessions: number;
  totalMessages: number;
  totalCommands: number;
  systemStatus: string;
  evolutionStatus: string;
}

// ─── Message Types ────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  session_id: string;
  sender_jid: string;
  sender_name: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'sticker' | 'document';
  timestamp: string;
  is_group: boolean;
  group_jid: string | null;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  groq_api_key: string | null;
  afk_enabled: boolean;
  afk_message: string;
  bot_name: string;
  created_at: string;
  updated_at: string;
}

// ─── Auto Reply Types ─────────────────────────────────────────────────────────

export interface AutoReply {
  id: string;
  user_id: string;
  session_id: string;
  trigger_keyword: string;
  response_text: string;
  is_regex: boolean;
  enabled: boolean;
}

// ─── Rate Limit Types ─────────────────────────────────────────────────────────

export interface RateLimitSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  window_ms: number;
  max_requests: number;
  enabled: boolean;
  description: string;
}
