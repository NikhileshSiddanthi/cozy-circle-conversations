-- Remove the failed view approach and keep the secure solution simple
-- Drop the view that failed to create policies
DROP VIEW IF EXISTS public.public_profiles;

-- The secure solution is already in place:
-- Only "Users can view their own profile" policy exists on profiles table
-- This completely protects phone numbers from unauthorized access

-- If applications need to display basic profile info of other users,
-- they should implement this through proper API endpoints or separate tables
-- For now, phone number security is the priority and is now protected

-- Verify the current state with a comment
COMMENT ON TABLE public.profiles IS 'Secure profile table: users can only access their own profile data, protecting sensitive information like phone numbers';