-- Drop and recreate the view with SECURITY INVOKER to fix the security linter error
DROP VIEW IF EXISTS public.elections_results_summary;

CREATE OR REPLACE VIEW public.elections_results_summary 
WITH (security_invoker = true) AS
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