-- ============================================================
-- Study Feature Tables
-- Supports: file uploads, content extraction, AI summaries,
-- quiz generation, progress tracking, reading schedules
-- ============================================================

-- ── Study Topics (categories) ───────────────────────────────
CREATE TABLE IF NOT EXISTS study_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#10b981',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_topics_user ON study_topics(user_id);

-- ── Study Materials (uploaded files / extracted content) ─────
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES study_topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'text',
  original_filename TEXT,
  content TEXT NOT NULL,
  word_count INT DEFAULT 0,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_materials_user ON study_materials(user_id);
CREATE INDEX idx_study_materials_topic ON study_materials(topic_id);

-- ── Study Summaries (AI-generated) ──────────────────────────
CREATE TABLE IF NOT EXISTS study_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL DEFAULT 'key_points',
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_summaries_material ON study_summaries(material_id);

-- ── Study Questions (AI-generated) ──────────────────────────
CREATE TABLE IF NOT EXISTS study_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_questions_material ON study_questions(material_id);

-- ── Quiz Attempts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES study_materials(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES study_topics(id) ON DELETE SET NULL,
  total_questions INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  wrong_answers INT NOT NULL DEFAULT 0,
  score_percent NUMERIC(5,2) DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  answers JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_quiz_attempts_user ON study_quiz_attempts(user_id);

-- ── Study Progress (per material tracking) ──────────────────
CREATE TABLE IF NOT EXISTS study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started',
  mastery_level INT DEFAULT 0,
  last_studied_at TIMESTAMPTZ,
  times_reviewed INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, material_id)
);

CREATE INDEX idx_study_progress_user ON study_progress(user_id);

-- ── Reading Schedule ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES study_topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  day_number INT NOT NULL,
  week_number INT NOT NULL DEFAULT 1,
  is_review_day BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_schedule_user ON study_schedule(user_id);

-- ── Flashcards ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  times_reviewed INT DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  ease_factor NUMERIC(4,2) DEFAULT 2.50,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_flashcards_material ON study_flashcards(material_id);
CREATE INDEX idx_study_flashcards_user ON study_flashcards(user_id);

-- ── RLS Policies ────────────────────────────────────────────
ALTER TABLE study_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_flashcards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY study_topics_user_policy ON study_topics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_materials_user_policy ON study_materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_summaries_user_policy ON study_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_questions_user_policy ON study_questions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_quiz_attempts_user_policy ON study_quiz_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_progress_user_policy ON study_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_schedule_user_policy ON study_schedule FOR ALL USING (auth.uid() = user_id);
CREATE POLICY study_flashcards_user_policy ON study_flashcards FOR ALL USING (auth.uid() = user_id);

-- Service role can access all data
CREATE POLICY study_topics_service_policy ON study_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_materials_service_policy ON study_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_summaries_service_policy ON study_summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_questions_service_policy ON study_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_quiz_attempts_service_policy ON study_quiz_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_progress_service_policy ON study_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_schedule_service_policy ON study_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY study_flashcards_service_policy ON study_flashcards FOR ALL USING (true) WITH CHECK (true);
