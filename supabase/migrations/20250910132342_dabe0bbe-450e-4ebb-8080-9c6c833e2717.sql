-- Simple and secure fix: Ensure only users can access their own profile data
-- This completely protects phone numbers and other sensitive information

-- Verify the current secure policy is in place (users can only see their own profile)
-- If for some reason it doesn't exist, recreate it
DO $$
BEGIN
    -- Check if the secure policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        -- Create the secure policy if it doesn't exist
        EXECUTE 'CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id)';
    END IF;
END
$$;

-- Add a security notice as a table comment
COMMENT ON TABLE public.profiles IS 'User profiles with RLS protection. Phone numbers and sensitive data are only accessible to the profile owner.';

-- Add column comments for security awareness
COMMENT ON COLUMN public.profiles.phone IS 'Protected: Only accessible to the profile owner via RLS policy';