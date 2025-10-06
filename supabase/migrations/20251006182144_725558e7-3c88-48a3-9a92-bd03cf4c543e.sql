-- Add message field to connections table
ALTER TABLE public.connections
ADD COLUMN message TEXT;

COMMENT ON COLUMN public.connections.message IS 'Optional message sent with connection request';