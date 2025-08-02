-- Insert sample news articles from trusted sources
-- First, let's get the category and source IDs we need
DO $$
DECLARE
    politics_cat_id UUID;
    world_cat_id UUID;
    economy_cat_id UUID;
    tech_cat_id UUID;
    health_cat_id UUID;
    env_cat_id UUID;
    bbc_id UUID;
    reuters_id UUID;
    ap_id UUID;
    npr_id UUID;
    guardian_id UUID;
    cnn_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO politics_cat_id FROM news_categories WHERE name = 'Politics';
    SELECT id INTO world_cat_id FROM news_categories WHERE name = 'World';
    SELECT id INTO economy_cat_id FROM news_categories WHERE name = 'Economy';
    SELECT id INTO tech_cat_id FROM news_categories WHERE name = 'Technology';
    SELECT id INTO health_cat_id FROM news_categories WHERE name = 'Health';
    SELECT id INTO env_cat_id FROM news_categories WHERE name = 'Environment';
    
    -- Get source IDs
    SELECT id INTO bbc_id FROM news_sources WHERE domain = 'bbc.com';
    SELECT id INTO reuters_id FROM news_sources WHERE domain = 'reuters.com';
    SELECT id INTO ap_id FROM news_sources WHERE domain = 'apnews.com';
    SELECT id INTO npr_id FROM news_sources WHERE domain = 'npr.org';
    SELECT id INTO guardian_id FROM news_sources WHERE domain = 'theguardian.com';
    SELECT id INTO cnn_id FROM news_sources WHERE domain = 'cnn.com';

    -- Insert sample articles
    INSERT INTO news_articles (title, description, url, image_url, published_at, source_id, category_id, author, is_featured) VALUES
    -- Politics
    ('Congress Passes Bipartisan Infrastructure Bill', 'Major infrastructure legislation receives overwhelming support from both parties, promising billions for roads, bridges, and broadband.', 'https://bbc.com/news/sample-infrastructure', 'https://images.unsplash.com/photo-1586892478025-2b5472316f22?w=800', NOW() - INTERVAL ''2 days'', bbc_id, politics_cat_id, 'Political Correspondent', true),
    
    ('Supreme Court Hears Arguments on Climate Case', 'Justices question both sides in landmark case that could reshape environmental policy nationwide.', 'https://npr.org/news/sample-supreme-court', 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=800', NOW() - INTERVAL ''1 day'', npr_id, politics_cat_id, 'Legal Affairs Reporter', true),
    
    -- World
    ('Global Climate Summit Reaches Historic Agreement', 'Nations commit to ambitious carbon reduction targets in what many call a turning point for climate action.', 'https://reuters.com/news/sample-climate-summit', 'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=800', NOW() - INTERVAL ''3 days'', reuters_id, world_cat_id, 'International Correspondent', true),
    
    ('Trade Relations Improve Between Major Economies', 'New bilateral agreements signal thawing of tensions and increased cooperation on economic issues.', 'https://theguardian.com/news/sample-trade', 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800', NOW() - INTERVAL ''4 days'', guardian_id, world_cat_id, 'Economics Editor', false),
    
    ('Diplomatic Breakthrough in Regional Conflict', 'Long-standing dispute shows signs of resolution after months of mediated negotiations.', 'https://apnews.com/news/sample-diplomacy', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800', NOW() - INTERVAL ''5 days'', ap_id, world_cat_id, 'Foreign Affairs Reporter', false),
    
    -- Economy
    ('Federal Reserve Adjusts Interest Rates', 'Central bank responds to economic indicators with measured policy changes aimed at maintaining stability.', 'https://reuters.com/news/sample-fed-rates', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800', NOW() - INTERVAL ''1 day'', reuters_id, economy_cat_id, 'Financial Reporter', true),
    
    ('Employment Numbers Show Steady Growth', 'Latest jobs report indicates continued recovery with unemployment reaching new lows in key sectors.', 'https://cnn.com/news/sample-employment', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', NOW() - INTERVAL ''2 days'', cnn_id, economy_cat_id, 'Labor Correspondent', false),
    
    ('Stock Markets React to Policy Changes', 'Major indices show mixed responses to new regulatory announcements from federal agencies.', 'https://bbc.com/news/sample-markets', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800', NOW() - INTERVAL ''6 hours'', bbc_id, economy_cat_id, 'Markets Analyst', false),
    
    -- Technology
    ('New Privacy Regulations Take Effect', 'Tech companies adapt to stricter data protection rules while maintaining user experience standards.', 'https://npr.org/news/sample-privacy', 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800', NOW() - INTERVAL ''3 days'', npr_id, tech_cat_id, 'Technology Reporter', false),
    
    ('Breakthrough in Quantum Computing Research', 'Scientists achieve new milestone in quantum processing power with potential applications across industries.', 'https://theguardian.com/news/sample-quantum', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800', NOW() - INTERVAL ''4 days'', guardian_id, tech_cat_id, 'Science Correspondent', true),
    
    ('AI Ethics Guidelines Released', 'Industry consortium publishes comprehensive framework for responsible artificial intelligence development.', 'https://cnn.com/news/sample-ai-ethics', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800', NOW() - INTERVAL ''1 day'', cnn_id, tech_cat_id, 'Tech Policy Writer', false),
    
    -- Health
    ('Medical Research Shows Promise for Treatment', 'Clinical trials demonstrate significant improvement in patient outcomes using novel therapeutic approach.', 'https://reuters.com/news/sample-medical', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800', NOW() - INTERVAL ''2 days'', reuters_id, health_cat_id, 'Medical Correspondent', false),
    
    ('Public Health Initiative Launches Nationwide', 'Government partners with healthcare organizations to expand access to preventive care services.', 'https://apnews.com/news/sample-health', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800', NOW() - INTERVAL ''5 days'', ap_id, health_cat_id, 'Health Reporter', false),
    
    ('Mental Health Services Receive Increased Funding', 'New budget allocation aims to address growing demand for mental health support across communities.', 'https://npr.org/news/sample-mental-health', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800', NOW() - INTERVAL ''3 days'', npr_id, health_cat_id, 'Healthcare Writer', true),
    
    -- Environment
    ('Renewable Energy Capacity Reaches New High', 'Solar and wind installations surpass previous records as costs continue to decline nationwide.', 'https://theguardian.com/news/sample-renewable', 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800', NOW() - INTERVAL ''1 day'', guardian_id, env_cat_id, 'Environment Editor', true),
    
    ('Conservation Efforts Show Positive Results', 'Wildlife populations recover in protected areas following coordinated conservation strategies.', 'https://bbc.com/news/sample-conservation', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', NOW() - INTERVAL ''4 days'', bbc_id, env_cat_id, 'Conservation Reporter', false),
    
    ('Water Quality Initiative Expands Coverage', 'Environmental protection measures extend to additional watersheds in response to community concerns.', 'https://cnn.com/news/sample-water', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', NOW() - INTERVAL ''6 days'', cnn_id, env_cat_id, 'Environmental Reporter', false);

END $$;