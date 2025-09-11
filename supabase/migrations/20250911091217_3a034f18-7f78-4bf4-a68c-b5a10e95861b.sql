-- Create link_previews table for caching URL metadata
CREATE TABLE IF NOT EXISTS public.link_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  url_hash text NOT NULL UNIQUE,
  title text,
  description text,
  image_url text,
  provider text,
  embed_html text,
  content_type text,
  favicon_url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  fetch_error text,
  checksums jsonb,
  last_refresh_attempt timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_link_previews_url_hash ON public.link_previews(url_hash);
CREATE INDEX idx_link_previews_provider ON public.link_previews(provider);
CREATE INDEX idx_link_previews_fetched_at ON public.link_previews(fetched_at);

-- Enable RLS
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view link previews" 
ON public.link_previews 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage link previews" 
ON public.link_previews 
FOR ALL 
USING (true);