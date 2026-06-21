-- User appearance preference (light / dark / system)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light'
  CHECK (theme IN ('light', 'dark', 'system'));
