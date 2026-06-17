-- Service Role Policies for BotWave
-- These policies allow the bot backend (using SUPABASE_SERVICE_ROLE_KEY) to bypass RLS
-- This is necessary because the bot service needs to read/write session data without user context

-- Enable bypass for service role on bot_sessions
CREATE POLICY "Service role can manage bot_sessions" ON public.bot_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert bot_sessions" ON public.bot_sessions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on bot_features
CREATE POLICY "Service role can manage bot_features" ON public.bot_features
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on messages
CREATE POLICY "Service role can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage messages" ON public.messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on auto_replies
CREATE POLICY "Service role can manage auto_replies" ON public.auto_replies
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on welcome_messages
CREATE POLICY "Service role can manage welcome_messages" ON public.welcome_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on polls
CREATE POLICY "Service role can manage polls" ON public.polls
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert polls" ON public.polls
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on game_states
CREATE POLICY "Service role can manage game_states" ON public.game_states
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable bypass for service role on leaderboard
CREATE POLICY "Service role can manage leaderboard" ON public.leaderboard
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert leaderboard" ON public.leaderboard
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Additional INSERT policies for user-facing operations
-- Allow users to insert into messages (for message history tracking)
CREATE POLICY "Users can insert own session messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Allow users to update leaderboard entries
CREATE POLICY "Users can insert own session leaderboard" ON public.leaderboard
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Admin policies for rate_limit_settings (backup if not already present)
CREATE POLICY "Admins can manage rate limit settings" ON public.rate_limit_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );