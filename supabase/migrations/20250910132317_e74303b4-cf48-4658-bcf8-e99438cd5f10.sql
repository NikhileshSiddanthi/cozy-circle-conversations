-- Fix the RLS policy logic issue - the previous approach still exposed phone numbers
-- Drop the problematic policy that still allowed viewing all profiles
DROP POLICY IF EXISTS "Users can view basic profile info of others" ON public.profiles;

-- The secure approach: Only allow users to view their own complete profile
-- This completely protects phone numbers and other sensitive data
-- Other profile viewing functionality should use a separate public view if needed

-- Create a public view for basic profile information (excluding sensitive data)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  id,
  display_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Set up RLS for the view (inherit from profiles table restrictions)
ALTER VIEW public.public_profiles SET (security_barrier = true);

-- Allow authenticated users to view the public profile information
CREATE POLICY "Anyone can view public profile info" 
ON public.public_profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Add helpful comment
COMMENT ON VIEW public.public_profiles IS 'Public view of profile data excluding sensitive information like phone numbers';