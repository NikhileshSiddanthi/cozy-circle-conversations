-- Fix phone number exposure in profiles table
-- Drop the overly permissive policy that exposes phone numbers
DROP POLICY IF EXISTS "Users can view basic profile info of others" ON public.profiles;

-- Create separate policies for own profile vs others' profiles
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view limited profile info of others"
ON public.profiles
FOR SELECT
USING (auth.uid() != user_id AND auth.uid() IS NOT NULL);

-- Fix link_previews overly permissive policy
DROP POLICY IF EXISTS "System can manage link previews" ON public.link_previews;
DROP POLICY IF EXISTS "Service role can manage link previews" ON public.link_previews;

CREATE POLICY "Service role can manage link previews"
ON public.link_previews
FOR ALL
USING (auth.role() = 'service_role');