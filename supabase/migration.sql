-- ============================================================================
-- Voice Trainer — Supabase Database Migration
-- ============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates all tables, row-level security policies, and triggers.
-- ============================================================================

-- ─── 1. Profiles ────────────────────────────────────────────────────────────
-- Auto-created on signup via trigger. Stores display name and avatar.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  avatar_url   TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ─── 2. User Progress ──────────────────────────────────────────────────────
-- Stores XP, streaks, sessions history, level. One row per user.

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions INT DEFAULT 0,
  total_minutes  INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  avg_accuracy   INT DEFAULT 0,
  xp             INT DEFAULT 0,
  level          TEXT DEFAULT 'beginner',
  sessions       JSONB DEFAULT '[]'::JSONB,     -- last 50 session objects
  last_date      TEXT DEFAULT NULL,              -- date string of last practice
  completed_ids  TEXT[] DEFAULT ARRAY[]::TEXT[],  -- exercise IDs completed
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON public.user_progress FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 3. Vocal Range ────────────────────────────────────────────────────────
-- Stores the user's tested vocal range. One row per user.

CREATE TABLE IF NOT EXISTS public.user_vocal_range (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  low_note   TEXT NOT NULL,            -- e.g. 'E2'
  high_note  TEXT NOT NULL,            -- e.g. 'A4'
  voice_type TEXT DEFAULT NULL,        -- e.g. 'baritone'
  semitones  INT DEFAULT 0,
  tested_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_vocal_range ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocal range"
  ON public.user_vocal_range FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own vocal range"
  ON public.user_vocal_range FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocal range"
  ON public.user_vocal_range FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── 4. User Preferences ───────────────────────────────────────────────────
-- Theme, notification settings, etc. One row per user.

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme                 TEXT DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── 5. Auto-create profile on signup ───────────────────────────────────────
-- Trigger: when a new user is created in auth.users, insert a row in profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running migration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 6. Updated_at auto-update ──────────────────────────────────────────────
-- Generic trigger to auto-set updated_at on any UPDATE.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.user_progress;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.user_vocal_range;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_vocal_range
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.user_preferences;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- Done! Your tables are ready. Now set these env vars in your Vercel project:
--
--   VITE_SUPABASE_URL       = https://your-project.supabase.co
--   VITE_SUPABASE_ANON_KEY  = eyJ...your-anon-key
--
-- And for dev bypass:
--   VITE_AUTH_BYPASS         = true    (dev only — remove in production)
-- ============================================================================
