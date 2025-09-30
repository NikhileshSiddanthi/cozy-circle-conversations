-- Add username column to profiles table
-- Unique, used for @mentions and profile URLs

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

COMMENT ON COLUMN public.profiles.username IS 'Unique username for @mentions and profile URLs. Separate from display_name which can contain spaces/emojis.';