-- Reminders table for !remind command
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  user_jid TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  message TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_session_id ON public.reminders(session_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_delivered ON public.reminders(delivered);

-- Notes table for !note command
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  user_jid TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_session_id ON public.notes(session_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_jid ON public.notes(user_jid);

-- Scheduled messages table for !schedule command
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  user_jid TEXT NOT NULL,
  target_jid TEXT NOT NULL,
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_session_id ON public.scheduled_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_send_at ON public.scheduled_messages(send_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_sent ON public.scheduled_messages(sent);

-- RLS policies (service role bypass)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access reminders" ON public.reminders
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access notes" ON public.notes
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access scheduled_messages" ON public.scheduled_messages
  FOR ALL USING (true) WITH CHECK (true);
