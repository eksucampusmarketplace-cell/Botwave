-- Add start_image_file_id column to telegram_bot_configs
-- Stores the Telegram file_id for the bot's /start command welcome image
-- Migration 041

ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS start_image_file_id TEXT DEFAULT NULL;
