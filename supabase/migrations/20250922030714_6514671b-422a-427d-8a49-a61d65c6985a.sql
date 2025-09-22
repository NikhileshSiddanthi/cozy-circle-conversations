-- Create visitor tracking table
CREATE TABLE public.visitor_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_visits bigint NOT NULL DEFAULT 0,
  unique_visitors bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial record
INSERT INTO public.visitor_stats (total_visits, unique_visitors) VALUES (0, 0);

-- Enable RLS
ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view visitor stats" 
ON public.visitor_stats 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage visitor stats" 
ON public.visitor_stats 
FOR ALL 
USING (true);

-- Create function to increment visitor count
CREATE OR REPLACE FUNCTION public.increment_visitor_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE visitor_stats 
  SET 
    total_visits = total_visits + 1,
    updated_at = now()
  WHERE id = (SELECT id FROM visitor_stats LIMIT 1);
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_visitor_stats_updated_at
BEFORE UPDATE ON public.visitor_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();