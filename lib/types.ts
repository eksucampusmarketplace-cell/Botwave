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
  | 'connecting'
  | 'qr_pending'
  | 'pairing_sent'
  | 'needs_reauth'
  | 'pairing_failed';

export type Platform = 'whatsapp' | 'telegram_bot' | 'telegram_userbot';

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
  last_pairing_error?: string | null;
  platform?: Platform;
  telegram_bot_token?: string;
  telegram_bot_username?: string;
  telegram_api_id?: number;
  telegram_api_hash?: string;
  telegram_session_string?: string;
  proxy_type?: 'shared' | 'custom';
  proxy_host?: string;
  proxy_port?: string;
  proxy_username?: string;
  proxy_password?: string;
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

// ─── Subscription Types ───────────────────────────────────────────────────────

export type SubscriptionPlan = 'free' | 'lite' | 'standard' | 'boss';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  quota_limit: number;
  quota_used: number;
  session_limit: number;
  ai_daily_limit: number;
  billing_start: string | null;
  next_renewal: string | null;
  squad_transaction_ref: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Payment Types ────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  plan: string;
  status: 'pending' | 'success' | 'failed';
  squad_transaction_ref: string | null;
  squad_gateway_ref: string | null;
  payment_channel: string | null;
  created_at: string;
}

// ─── Reward Types ─────────────────────────────────────────────────────────────

export interface RewardBalance {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_cashed_out: number;
  last_cashout_at: string | null;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  action: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface AirtimeCashout {
  id: string;
  user_id: string;
  phone_number: string;
  amount: number;
  network: string | null;
  status: 'pending' | 'success' | 'failed';
  inlomax_reference: string | null;
  error_message: string | null;
  created_at: string;
}
