-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = _group_id 
    AND gm.user_id = _user_id 
    AND gm.status = 'approved'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path TO '';

-- Also fix the existing has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;