-- Create link_previews table for caching URL metadata
CREATE TABLE IF NOT EXISTS public.link_previews (
  url TEXT NOT NULL,
  url_hash TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_url TEXT,
  provider TEXT,
  embed_html TEXT,
  content_type TEXT,
  favicon_url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fetch_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS idx_link_previews_url ON public.link_previews(url);

-- Create index on fetched_at for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_link_previews_fetched_at ON public.link_previews(fetched_at);

-- Enable RLS
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

-- Allow public read access to link previews (they're just metadata)
CREATE POLICY "Link previews are publicly readable" 
ON public.link_previews 
FOR SELECT 
USING (true);

-- Allow service role to manage link previews
CREATE POLICY "Service role can manage link previews" 
ON public.link_previews 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_link_previews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_link_previews_updated_at
  BEFORE UPDATE ON public.link_previews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_link_previews_updated_at();