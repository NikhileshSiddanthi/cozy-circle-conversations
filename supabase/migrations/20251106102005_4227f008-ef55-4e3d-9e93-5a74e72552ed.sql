-- Clean up fake seed data
DELETE FROM elections_sentiment_snapshots WHERE total_articles_analyzed = 0;

-- Enable extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule hourly sentiment collection
SELECT cron.schedule(
  'collect-election-sentiment-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://fwbgnhpjrspddyzntbra.supabase.co/functions/v1/collect-election-sentiment',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YmduaHBqcnNwZGR5em50YnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjUyNjIsImV4cCI6MjA3NzQwMTI2Mn0.iHOGlnPmIKFMS7Wkwoex-AFYtIBd5SdEvOYShdbRQfI"}'::jsonb,
        body:='{"election_slug": "jubilee-hills-2025"}'::jsonb
    ) as request_id;
  $$
);