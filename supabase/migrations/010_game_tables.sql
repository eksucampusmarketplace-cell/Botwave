-- Game Platform Tables (minimal — Redis handles active game state)
-- Only stores persistent post-game data: results and ratings

-- Game results (written once when a game ends)
CREATE TABLE IF NOT EXISTS game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  player1_id TEXT NOT NULL,
  player1_name TEXT,
  player2_id TEXT NOT NULL,
  player2_name TEXT,
  winner_id TEXT,
  result_type TEXT NOT NULL, -- checkmate, resign, timeout, draw, stalemate, abandon
  moves_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  player1_rating_change INTEGER DEFAULT 0,
  player2_rating_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player ratings per game type
CREATE TABLE IF NOT EXISTS player_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_results_room ON game_results(room_id);
CREATE INDEX IF NOT EXISTS idx_game_results_players ON game_results(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_game_results_created ON game_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_ratings_user ON player_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_elo ON player_ratings(game_type, elo_rating DESC);

-- RLS policies (service role can do everything)
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_game_results" ON game_results
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_player_ratings" ON player_ratings
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anon read for leaderboards
CREATE POLICY "anon_read_ratings" ON player_ratings
  FOR SELECT USING (true);

CREATE POLICY "anon_read_results" ON game_results
  FOR SELECT USING (true);
