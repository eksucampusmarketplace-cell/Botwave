export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface BotSession {
  id: string;
  user_id: string;
  phone_number: string;
  session_name: string;
  state: 'active' | 'inactive' | 'qr_pending' | 'needs_reauth';
  qr_code: string | null;
  qr_expires_at: string | null;
  pairing_code: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface BotFeature {
  id: string;
  user_id: string;
  session_id: string;
  feature_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  sender_jid: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'sticker' | 'document';
  timestamp: string;
  is_group: boolean;
  group_jid: string | null;
}

export interface GameState {
  session_id: string;
  game_type: 'trivia' | 'hangman' | 'wordchain' | 'numberguess';
  player_jid: string;
  data: Record<string, unknown>;
  started_at: string;
  ends_at: string | null;
}

export interface LeaderboardEntry {
  session_id: string;
  user_jid: string;
  user_name: string;
  message_count: number;
  score: number;
  rank: number;
}

export interface AutoReply {
  id: string;
  user_id: string;
  session_id: string;
  trigger_keyword: string;
  response_text: string;
  is_regex: boolean;
  enabled: boolean;
  created_at: string;
}

export interface WelcomeMessage {
  id: string;
  user_id: string;
  session_id: string;
  group_jid: string;
  message_text: string;
  enabled: boolean;
  created_at: string;
}

export interface Poll {
  id: string;
  session_id: string;
  group_jid: string;
  question: string;
  options: string[];
  votes: Record<string, string[]>;
  is_active: boolean;
  created_by_jid: string;
  created_at: string;
  ends_at: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RateLimitConfig {
  setting_key: string;
  setting_name: string;
  window_ms: number;
  max_requests: number;
  enabled: boolean;
  description?: string;
}

export interface RateLimitSetting extends RateLimitConfig {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface BotCommand {
  name: string;
  description: string;
  usage: string;
  aliases: string[];
  category: 'general' | 'games' | 'tools' | 'admin' | 'ai';
  execute: (params: CommandParams) => Promise<void>;
}

export interface CommandParams {
  args: string[];
  msg: Message;
  socket: unknown;
  sessionId: string;
  userId: string;
}
