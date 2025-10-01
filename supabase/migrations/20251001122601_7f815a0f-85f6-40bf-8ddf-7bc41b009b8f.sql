-- Update existing users with null display_name by extracting from email
-- This will convert email addresses like "john.doe@example.com" to "John Doe"
UPDATE public.profiles
SET display_name = INITCAP(REPLACE(SPLIT_PART(au.email, '@', 1), '.', ' '))
FROM auth.users au
WHERE profiles.user_id = au.id
  AND profiles.display_name IS NULL
  AND au.email IS NOT NULL;

-- Make display_name required for future records (with a sensible default)
ALTER TABLE public.profiles 
ALTER COLUMN display_name SET DEFAULT 'User';

-- Ensure the trigger properly handles display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Insert into profiles table with proper display_name fallback
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' ')),
      'User'
    )
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add a comment explaining the logic
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates profile and role for new users. Falls back to email-based name if display_name not provided.';