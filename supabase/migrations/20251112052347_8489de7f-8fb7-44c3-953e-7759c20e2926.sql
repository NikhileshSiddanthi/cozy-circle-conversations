-- Create elections_results table for live vote counting
CREATE TABLE public.elections_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  election_slug TEXT NOT NULL DEFAULT 'jubilee-hills-2025',
  candidate_id UUID REFERENCES public.elections_candidates(id) ON DELETE CASCADE,
  booth_id UUID REFERENCES public.elections_booths(id) ON DELETE CASCADE,
  votes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'counting', -- 'counting', 'verified', 'final'
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_elections_results_candidate ON public.elections_results(candidate_id);
CREATE INDEX idx_elections_results_booth ON public.elections_results(booth_id);
CREATE INDEX idx_elections_results_election ON public.elections_results(election_slug);

-- Enable RLS
ALTER TABLE public.elections_results ENABLE ROW LEVEL SECURITY;

-- Anyone can view results
CREATE POLICY "Anyone can view results"
  ON public.elections_results
  FOR SELECT
  USING (true);

-- Only admins can manage results
CREATE POLICY "Admins can manage results"
  ON public.elections_results
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.elections_results;

-- Create a view for aggregated results
CREATE OR REPLACE VIEW public.elections_results_summary AS
SELECT 
  er.election_slug,
  er.candidate_id,
  ec.name as candidate_name,
  ec.party,
  ec.symbol,
  SUM(er.votes) as total_votes,
  COUNT(DISTINCT er.booth_id) as booths_counted,
  (SELECT COUNT(*) FROM public.elections_booths WHERE election_slug = er.election_slug) as total_booths
FROM public.elections_results er
JOIN public.elections_candidates ec ON er.candidate_id = ec.id
WHERE er.status IN ('verified', 'final')
GROUP BY er.election_slug, er.candidate_id, ec.name, ec.party, ec.symbol
ORDER BY total_votes DESC;