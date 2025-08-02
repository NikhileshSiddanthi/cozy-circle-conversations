-- Create news categories table
CREATE TABLE public.news_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'Newspaper',
  color_class TEXT DEFAULT 'bg-primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trusted news sources table
CREATE TABLE public.news_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news articles table
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source_id UUID NOT NULL REFERENCES public.news_sources(id),
  category_id UUID NOT NULL REFERENCES public.news_categories(id),
  author TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_categories
CREATE POLICY "Anyone can view news categories" 
ON public.news_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify news categories" 
ON public.news_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for news_sources
CREATE POLICY "Anyone can view active news sources" 
ON public.news_sources 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage news sources" 
ON public.news_sources 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for news_articles
CREATE POLICY "Anyone can view news articles from verified sources" 
ON public.news_articles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.news_sources 
  WHERE id = news_articles.source_id 
  AND is_verified = true 
  AND is_active = true
));

CREATE POLICY "Only admins can manage news articles" 
ON public.news_articles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create updated_at triggers
CREATE TRIGGER update_news_categories_updated_at
BEFORE UPDATE ON public.news_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_sources_updated_at
BEFORE UPDATE ON public.news_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at
BEFORE UPDATE ON public.news_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default news categories
INSERT INTO public.news_categories (name, description, icon, color_class) VALUES
('Politics', 'Political news and government updates', 'Vote', 'bg-blue-500'),
('World', 'International news and global events', 'Globe', 'bg-green-500'),
('Economy', 'Business and economic news', 'TrendingUp', 'bg-purple-500'),
('Technology', 'Tech news and innovations', 'Smartphone', 'bg-indigo-500'),
('Health', 'Health and medical news', 'Heart', 'bg-red-500'),
('Environment', 'Climate and environmental news', 'Leaf', 'bg-emerald-500');

-- Insert some trusted news sources
INSERT INTO public.news_sources (name, domain, description, is_verified, is_active) VALUES
('BBC News', 'bbc.com', 'British Broadcasting Corporation', true, true),
('Reuters', 'reuters.com', 'International news organization', true, true),
('Associated Press', 'apnews.com', 'American news agency', true, true),
('NPR', 'npr.org', 'National Public Radio', true, true),
('The Guardian', 'theguardian.com', 'British daily newspaper', true, true),
('CNN', 'cnn.com', 'Cable News Network', true, true);