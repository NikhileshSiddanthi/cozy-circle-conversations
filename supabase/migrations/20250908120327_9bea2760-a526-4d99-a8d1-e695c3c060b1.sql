-- Check current user and assign admin role
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user ID (this will work when run from the application context)
    SELECT auth.uid() INTO current_user_id;
    
    -- If no current user, get the first user and make them admin
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    END IF;
    
    -- Insert admin role if it doesn't exist
    INSERT INTO public.user_roles (user_id, role)
    VALUES (current_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: %', current_user_id;
END $$;