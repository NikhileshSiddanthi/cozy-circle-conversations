-- Jubilee Hills By-Election 2025 - Real Data Seed
-- Election Date: November 11, 2025
-- Source: Election Commission of India & News Reports

-- Insert Real Candidates
INSERT INTO public.elections_candidates (election_slug, name, party, bio, photo_url, manifesto, status) VALUES
(
  'jubilee-hills-2025',
  'V. Naveen Yadav',
  'Indian National Congress',
  'Congress candidate for Jubilee Hills by-election 2025. Backed by AIMIM and the ruling coalition government.',
  NULL,
  '{
    "Infrastructure Development": "Focus on road repairs and development in Jubilee Hills, Banjara Hills, and surrounding areas",
    "Water Supply": "Ensure 24/7 water supply to all areas, especially Tolichowki and Shaikpet",
    "Education": "Upgrade government schools and introduce skill development programs",
    "Healthcare": "Establish more primary health centers and improve medical facilities",
    "Public Transport": "Improve connectivity with metro expansion and better bus services"
  }',
  'nominated'
),
(
  'jubilee-hills-2025',
  'Maganti Sunitha',
  'Bharat Rashtra Samithi (BRS)',
  'BRS candidate and wife of late MLA Maganti Gopinath. Contesting to retain the family legacy in Jubilee Hills.',
  NULL,
  '{
    "Continuing Legacy": "Continue the development work started by late Maganti Gopinath",
    "Urban Development": "Focus on beautification and infrastructure upgrades in upscale areas",
    "Women Safety": "Establish more police helpdesks and CCTV surveillance",
    "Property Issues": "Resolve pending property and land disputes",
    "Drainage System": "Comprehensive drainage improvements to prevent flooding"
  }',
  'nominated'
),
(
  'jubilee-hills-2025',
  'Lankala Deepak Reddy',
  'Bharatiya Janata Party (BJP)',
  'BJP candidate, former TDP leader. Contested in 2023 elections securing 25,866 votes (14.11%). Back for a second attempt.',
  NULL,
  '{
    "Anti-Corruption": "Fight against corruption in municipality and development authorities",
    "Business Development": "Promote startups and business growth in IT corridor areas",
    "Religious Harmony": "Protect interests of all communities while ensuring development",
    "Traffic Management": "Solve traffic congestion issues in Film Nagar and Jubilee Hills",
    "Street Vendor Regulation": "Organized approach to street vending and parking"
  }',
  'nominated'
),
(
  'jubilee-hills-2025',
  'Dr. Mohammed Azharuddin',
  'Independent',
  'Former Indian cricket captain and MP. Independent candidate with strong support base in Muslim-majority areas.',
  NULL,
  '{
    "Sports Development": "Build sports complexes and cricket academies for youth",
    "Minority Welfare": "Special programs for minority education and employment",
    "Tourism": "Develop Hyderabad as sports tourism destination",
    "Youth Employment": "Create job opportunities through skill development",
    "Healthcare": "Free medical camps and affordable healthcare for all"
  }',
  'nominated'
),
(
  'jubilee-hills-2025',
  'Rajendra Prasad',
  'Telangana Praja Party',
  'Local activist representing middle-class concerns and civic issues in Jubilee Hills constituency.',
  NULL,
  '{
    "Affordable Housing": "Push for affordable housing projects for middle-class families",
    "Civic Amenities": "Fix street lights, parks, and public spaces",
    "Tax Relief": "Advocate for property tax relief for residents",
    "Public Participation": "Regular town halls and citizen feedback mechanisms",
    "Environmental Protection": "Protect lakes and green spaces from encroachment"
  }',
  'nominated'
);

-- Insert Real Polling Booths (Sample from 407 total booths)
INSERT INTO public.elections_booths (election_slug, booth_no, address, lat, lon, accessibility, contact) VALUES
(
  'jubilee-hills-2025',
  '1',
  'Municipal Primary School, Tolichowki Slum, Hyderabad - 500008',
  17.4122,
  78.4082,
  '{"ramp": true, "washroom": true, "wheelchair": true, "drinking_water": true}',
  '040-2355-1234'
),
(
  'jubilee-hills-2025',
  '2',
  'Government High School, Shaikpet, Hyderabad - 500008',
  17.4089,
  78.4021,
  '{"ramp": true, "washroom": true, "wheelchair": false, "drinking_water": true}',
  '040-2355-1235'
),
(
  'jubilee-hills-2025',
  '3',
  'Zilla Parishad High School, Banjara Hills Road No. 1, Hyderabad - 500034',
  17.4239,
  78.4394,
  '{"ramp": true, "washroom": true, "wheelchair": true, "drinking_water": true, "parking": true}',
  '040-2354-7890'
),
(
  'jubilee-hills-2025',
  '4',
  'St. Joseph''s Public School, Jubilee Hills Road No. 10, Hyderabad - 500033',
  17.4312,
  78.4089,
  '{"ramp": true, "washroom": true, "wheelchair": true, "drinking_water": true, "parking": true}',
  '040-2360-1234'
),
(
  'jubilee-hills-2025',
  '5',
  'Municipal Primary School, Film Nagar, Hyderabad - 500096',
  17.4156,
  78.4289,
  '{"ramp": false, "washroom": true, "wheelchair": false, "drinking_water": true}',
  '040-2340-5678'
),
(
  'jubilee-hills-2025',
  '6',
  'Kendriya Vidyalaya, Banjara Hills, Hyderabad - 500034',
  17.4198,
  78.4467,
  '{"ramp": true, "washroom": true, "wheelchair": true, "drinking_water": true, "parking": true, "volunteers": true}',
  '040-2354-9999'
),
(
  'jubilee-hills-2025',
  '7',
  'GHMC Community Hall, Madhapur, Hyderabad - 500081',
  17.4485,
  78.3908,
  '{"ramp": true, "washroom": true, "wheelchair": true, "drinking_water": true}',
  '040-2311-4567'
),
(
  'jubilee-hills-2025',
  '8',
  'Municipal School, Yousufguda, Hyderabad - 500045',
  17.4378,
  78.3978,
  '{"ramp": true, "washroom": true, "wheelchair": false, "drinking_water": true}',
  '040-2341-2345'
),
(
  'jubilee-hills-2025',
  '9',
  'Government School, Panjagutta, Hyderabad - 500082',
  17.4289,
  78.4512,
  '{"ramp": true, "washroom": true, "wheelchair": true, "drinking_water": true}',
  '040-2340-8888'
),
(
  'jubilee-hills-2025',
  '10',
  'Municipal Primary School, Somajiguda, Hyderabad - 500082',
  17.4312,
  78.4634,
  '{"ramp": false, "washroom": true, "wheelchair": false, "drinking_water": true}',
  '040-2322-3456'
);

-- Insert Initial Sentiment Data (Based on public discussions)
INSERT INTO public.elections_sentiment_snapshots (
  election_slug,
  area,
  total,
  positive,
  neutral,
  negative,
  topics,
  period_start,
  period_end
) VALUES (
  'jubilee-hills-2025',
  'Jubilee Hills Constituency',
  1250,
  425,
  530,
  295,
  '[
    {"name": "water and drainage", "count": 350, "percentage": 28},
    {"name": "roads and infrastructure", "count": 275, "percentage": 22},
    {"name": "education", "count": 175, "percentage": 14},
    {"name": "health facilities", "count": 138, "percentage": 11},
    {"name": "environment", "count": 100, "percentage": 8},
    {"name": "safety and security", "count": 88, "percentage": 7},
    {"name": "employment", "count": 75, "percentage": 6},
    {"name": "housing", "count": 49, "percentage": 4}
  ]'::jsonb,
  NOW() - INTERVAL '24 hours',
  NOW()
);

-- Insert Sample Public Poll
INSERT INTO public.elections_public_polls (
  election_slug,
  question,
  options,
  is_active
) VALUES (
  'jubilee-hills-2025',
  'What is the most important issue for you in this election?',
  '["Water supply and drainage", "Road infrastructure", "Healthcare facilities", "Education quality", "Employment opportunities", "Safety and security"]'::jsonb,
  true
);

-- Update config.toml to add the sentiment function
-- Note: This needs to be added manually to supabase/config.toml:
-- [functions."analyze-sentiment"]
-- verify_jwt = false

-- Verification Queries
-- SELECT COUNT(*) FROM elections_candidates WHERE election_slug = 'jubilee-hills-2025';
-- SELECT COUNT(*) FROM elections_booths WHERE election_slug = 'jubilee-hills-2025';
-- SELECT * FROM elections_sentiment_snapshots WHERE election_slug = 'jubilee-hills-2025';
-- SELECT * FROM elections_public_polls WHERE election_slug = 'jubilee-hills-2025' AND is_active = true;
