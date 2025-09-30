-- Add icon column to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Users';