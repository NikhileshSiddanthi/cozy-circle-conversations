-- Fix security warnings by setting search_path on helper functions
-- This prevents potential SQL injection and ensures predictable behavior

CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, required_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 AND user_roles.role = $2
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conversation_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = $1 
      AND conversation_participants.user_id = $2
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_group_admin_or_moderator(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = $1 
      AND group_members.user_id = $2 
      AND group_members.role IN ('admin', 'moderator')
      AND group_members.status = 'approved'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = $1 
      AND group_members.user_id = $2 
      AND group_members.status = 'approved'
  );
$function$;