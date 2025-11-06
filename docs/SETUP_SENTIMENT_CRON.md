# Setup Automated Sentiment Collection

## Overview
This guide explains how to set up automated sentiment collection for the Jubilee Hills election dashboard. The system collects posts and comments from your app, analyzes them for election-related content, and updates sentiment data every hour.

## Architecture

1. **collect-election-sentiment** - Edge function that:
   - Fetches recent posts/comments (last 7 days)
   - Filters for election-related keywords
   - Calls the analyze-sentiment function
   - Results are automatically stored in `elections_sentiment_snapshots`

2. **analyze-sentiment** - Edge function that:
   - Receives text data
   - Analyzes sentiment using Hugging Face models
   - Extracts topics (candidates)
   - Stores aggregated results

## Setup Instructions

### Step 1: Enable Required Extensions

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create the Cron Job

Run this SQL to set up hourly sentiment collection:

```sql
-- Schedule sentiment collection every hour
SELECT cron.schedule(
  'collect-election-sentiment-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://fwbgnhpjrspddyzntbra.supabase.co/functions/v1/collect-election-sentiment',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YmduaHBqcnNwZGR5em50YnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjUyNjIsImV4cCI6MjA3NzQwMTI2Mn0.iHOGlnPmIKFMS7Wkwoex-AFYtIBd5SdEvOYShdbRQfI"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Step 3: Verify Cron Job

Check if the cron job was created successfully:

```sql
SELECT * FROM cron.job;
```

You should see `collect-election-sentiment-hourly` in the list.

### Step 4: Manual Testing

Test the sentiment collection manually before waiting for the cron:

```sql
SELECT
  net.http_post(
    url := 'https://fwbgnhpjrspddyzntbra.supabase.co/functions/v1/collect-election-sentiment',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YmduaHBqcnNwZGR5em50YnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjUyNjIsImV4cCI6MjA3NzQwMTI2Mn0.iHOGlnPmIKFMS7Wkwoex-AFYtIBd5SdEvOYShdbRQfI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
```

### Step 5: Check Function Logs

Monitor the edge function logs in Supabase Dashboard:
- Go to Edge Functions → collect-election-sentiment → Logs
- You should see logs showing posts/comments being collected and analyzed

## Monitoring

### View Recent Sentiment Data

```sql
SELECT * FROM elections_sentiment_snapshots
ORDER BY created_at DESC
LIMIT 5;
```

### View Cron Job History

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'collect-election-sentiment-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

### Check Function Execution

```sql
-- Check if requests are being made
SELECT 
  status_code,
  content::text,
  created_at
FROM net._http_response
ORDER BY created_at DESC
LIMIT 10;
```

## Customization

### Change Collection Frequency

To run every 30 minutes instead of hourly:

```sql
SELECT cron.unschedule('collect-election-sentiment-hourly');

SELECT cron.schedule(
  'collect-election-sentiment-half-hourly',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://fwbgnhpjrspddyzntbra.supabase.co/functions/v1/collect-election-sentiment',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YmduaHBqcnNwZGR5em50YnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjUyNjIsImV4cCI6MjA3NzQwMTI2Mn0.iHOGlnPmIKFMS7Wkwoex-AFYtIBd5SdEvOYShdbRQfI"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Add More Keywords

Edit `supabase/functions/collect-election-sentiment/index.ts` and add keywords to the `electionKeywords` array.

### Adjust Time Window

Change the `sevenDaysAgo` calculation to collect from a different time period:

```typescript
// Collect from last 24 hours
const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);
```

## Troubleshooting

### Cron job not running?

Check if extensions are enabled:
```sql
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

### No sentiment data appearing?

1. Check edge function logs for errors
2. Verify posts/comments contain election keywords
3. Ensure Hugging Face API token is valid
4. Check that analyze-sentiment function is working

### Rate limiting issues?

The Hugging Face API has rate limits. If you hit them:
1. Reduce collection frequency
2. Limit the number of texts analyzed (currently 50)
3. Consider upgrading your Hugging Face plan

## Stopping Automated Collection

To disable the cron job:

```sql
SELECT cron.unschedule('collect-election-sentiment-hourly');
```

To re-enable, run the schedule command again from Step 2.
