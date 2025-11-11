-- Add columns for predictions and external sources to sentiment snapshots
ALTER TABLE public.elections_sentiment_snapshots
ADD COLUMN IF NOT EXISTS prediction_data jsonb,
ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_articles_analyzed integer DEFAULT 0;

-- Add comment explaining the new columns
COMMENT ON COLUMN public.elections_sentiment_snapshots.prediction_data IS 'Stores prediction data including likely winner, confidence score, and reasoning';
COMMENT ON COLUMN public.elections_sentiment_snapshots.sources IS 'Array of external sources analyzed (news sites, social media, etc.)';
COMMENT ON COLUMN public.elections_sentiment_snapshots.total_articles_analyzed IS 'Total number of external articles/posts analyzed';

-- Create index for querying predictions
CREATE INDEX IF NOT EXISTS idx_sentiment_predictions ON public.elections_sentiment_snapshots(election_slug, created_at DESC) 
WHERE prediction_data IS NOT NULL;