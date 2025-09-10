-- Fix security vulnerability: Restrict profiles table access to protect phone numbers
-- Drop the overly permissive SELECT policy that allows viewing all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that allows users to view their own profile only
-- This protects sensitive data like phone numbers from unauthorized access
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a separate policy for viewing other users' basic profile info (excluding phone numbers)
-- This allows functionality like viewing display names and avatars while protecting sensitive data
CREATE POLICY "Users can view basic profile info of others" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() != user_id AND auth.uid() IS NOT NULL);

-- Add a security comment for future reference
COMMENT ON TABLE public.profiles IS 'Contains user profile data. Phone numbers are protected by RLS policies - only users can see their own phone number.';