-- Election Dashboard Schema

-- Candidates table
CREATE TABLE IF NOT EXISTS public.elections_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_slug TEXT NOT NULL DEFAULT 'jubilee-hills-2025',
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  symbol TEXT,
  photo_url TEXT,
  bio TEXT,
  manifesto JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'nominated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Polling booths table
CREATE TABLE IF NOT EXISTS public.elections_booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_slug TEXT NOT NULL DEFAULT 'jubilee-hills-2025',
  booth_no TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT,
  lon FLOAT,
  accessibility JSONB DEFAULT '{}',
  contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sentiment snapshots table
CREATE TABLE IF NOT EXISTS public.elections_sentiment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_slug TEXT NOT NULL DEFAULT 'jubilee-hills-2025',
  area TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  positive INTEGER NOT NULL DEFAULT 0,
  neutral INTEGER NOT NULL DEFAULT 0,
  negative INTEGER NOT NULL DEFAULT 0,
  topics JSONB DEFAULT '[]',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public polls table
CREATE TABLE IF NOT EXISTS public.elections_public_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_slug TEXT NOT NULL DEFAULT 'jubilee-hills-2025',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poll responses table (for tracking votes)
CREATE TABLE IF NOT EXISTS public.elections_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.elections_public_polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.elections_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections_booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections_sentiment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections_public_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections_poll_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidates
CREATE POLICY "Anyone can view candidates"
  ON public.elections_candidates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage candidates"
  ON public.elections_candidates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for booths
CREATE POLICY "Anyone can view booths"
  ON public.elections_booths FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage booths"
  ON public.elections_booths FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for sentiment
CREATE POLICY "Anyone can view sentiment"
  ON public.elections_sentiment_snapshots FOR SELECT
  USING (true);

CREATE POLICY "System can manage sentiment"
  ON public.elections_sentiment_snapshots FOR ALL
  USING (true);

-- RLS Policies for polls
CREATE POLICY "Anyone can view polls"
  ON public.elections_public_polls FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage polls"
  ON public.elections_public_polls FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for poll responses
CREATE POLICY "Anyone can submit poll responses"
  ON public.elections_poll_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view poll responses"
  ON public.elections_poll_responses FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_election ON public.elections_candidates(election_slug);
CREATE INDEX IF NOT EXISTS idx_booths_election ON public.elections_booths(election_slug);
CREATE INDEX IF NOT EXISTS idx_sentiment_election ON public.elections_sentiment_snapshots(election_slug);
CREATE INDEX IF NOT EXISTS idx_polls_active ON public.elections_public_polls(is_active);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON public.elections_poll_responses(poll_id);

-- Trigger for updated_at
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.elections_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();