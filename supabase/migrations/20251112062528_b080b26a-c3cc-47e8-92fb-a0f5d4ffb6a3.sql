-- Constituency metadata
CREATE TABLE IF NOT EXISTS constituencies (
  id text PRIMARY KEY,
  name text NOT NULL,
  state text,
  district text,
  eci_code text,
  geo jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Raw ingested events (immutable audit log)
CREATE TABLE IF NOT EXISTS election_raw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL, -- eci|ro|wire|exitpoll|social
  source_payload jsonb NOT NULL,
  ingestion_time timestamptz DEFAULT now(),
  event_time timestamptz NOT NULL,
  processed boolean DEFAULT false,
  constituency_id text REFERENCES constituencies(id),
  created_at timestamptz DEFAULT now()
);

-- Normalized counts and predictions
CREATE TABLE IF NOT EXISTS election_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_id text REFERENCES constituencies(id),
  source text NOT NULL,
  kind text CHECK (kind IN ('official','projection','wire','unverified')),
  data jsonb NOT NULL,
  round_number integer,
  form20_url text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Aggregated canonical state (reconciled best view)
CREATE TABLE IF NOT EXISTS election_canonical (
  constituency_id text PRIMARY KEY REFERENCES constituencies(id),
  last_update timestamptz NOT NULL,
  canonical_data jsonb NOT NULL,
  source text NOT NULL,
  total_counted integer,
  leading_party text,
  status text CHECK (status IN ('counting','called','recounting')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exit polls (separate for metadata)
CREATE TABLE IF NOT EXISTS exit_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  constituency_id text REFERENCES constituencies(id),
  sample_size integer,
  methodology text,
  predicted_winner text,
  vote_share jsonb,
  confidence numeric,
  margin_of_error numeric,
  raw jsonb,
  published_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_canonical ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_polls ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read access for transparency
CREATE POLICY "Anyone can view constituencies"
  ON constituencies FOR SELECT USING (true);

CREATE POLICY "Anyone can view canonical results"
  ON election_canonical FOR SELECT USING (true);

CREATE POLICY "Anyone can view election counts"
  ON election_counts FOR SELECT USING (true);

CREATE POLICY "Anyone can view exit polls"
  ON exit_polls FOR SELECT USING (true);

CREATE POLICY "Anyone can view raw events"
  ON election_raw_events FOR SELECT USING (true);

-- Admin policies for data ingestion
CREATE POLICY "Admins can manage constituencies"
  ON constituencies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can ingest raw events"
  ON election_raw_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage raw events"
  ON election_raw_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert counts"
  ON election_counts FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage counts"
  ON election_counts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can update canonical"
  ON election_canonical FOR ALL USING (true);

CREATE POLICY "System can insert exit polls"
  ON exit_polls FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage exit polls"
  ON exit_polls FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE election_canonical;
ALTER PUBLICATION supabase_realtime ADD TABLE election_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE exit_polls;

-- Indexes for performance
CREATE INDEX idx_election_counts_constituency ON election_counts(constituency_id, created_at DESC);
CREATE INDEX idx_election_canonical_status ON election_canonical(status);
CREATE INDEX idx_raw_events_constituency ON election_raw_events(constituency_id, event_time DESC);
CREATE INDEX idx_exit_polls_constituency ON exit_polls(constituency_id, published_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_constituencies_updated_at
  BEFORE UPDATE ON constituencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_election_counts_updated_at
  BEFORE UPDATE ON election_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_election_canonical_updated_at
  BEFORE UPDATE ON election_canonical
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Jubilee Hills constituency
INSERT INTO constituencies (id, name, state, district, eci_code)
VALUES ('jubilee-hills-2025', 'Jubilee Hills', 'Telangana', 'Hyderabad', 'S2901')
ON CONFLICT (id) DO NOTHING;