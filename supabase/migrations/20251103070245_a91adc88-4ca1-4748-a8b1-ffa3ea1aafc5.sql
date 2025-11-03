-- Add missing unique constraint on user_roles table
-- This constraint is required by the handle_new_user() trigger function
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);