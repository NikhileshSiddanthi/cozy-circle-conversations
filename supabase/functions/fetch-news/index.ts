import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const newsApiKey = Deno.env.get('NEWS_API_KEY')
    if (!newsApiKey) {
      console.log('No NEWS_API_KEY found, using mock data')
      return await insertMockNews(supabaseClient)
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || 'general'
    const query = searchParams.get('query') || ''

    // Build NewsAPI URL
    let newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&pageSize=50&language=en`
    
    if (category && category !== 'all') {
      const categoryMap: Record<string, string> = {
        'politics': 'general',
        'economy': 'business', 
        'environment': 'science',
        'health': 'health',
        'technology': 'technology',
        'world': 'general'
      }
      newsApiUrl += `&category=${categoryMap[category] || 'general'}`
    }

    if (query) {
      newsApiUrl = `https://newsapi.org/v2/everything?apiKey=${newsApiKey}&q=${encodeURIComponent(query)}&pageSize=50&language=en&sortBy=publishedAt`
    }

    console.log('Fetching from NewsAPI:', newsApiUrl.replace(newsApiKey, '[API_KEY]'))

    const response = await fetch(newsApiUrl)
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data: NewsAPIResponse = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned error status')
    }

    // Process and insert articles
    await processAndInsertArticles(supabaseClient, data.articles, category)

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesProcessed: data.articles.length,
        category: category 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in fetch-news function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processAndInsertArticles(supabaseClient: any, articles: NewsAPIArticle[], category: string) {
  // Get or create categories and sources first
  const categoryMap = await ensureCategories(supabaseClient)
  const sourceMap = await ensureSources(supabaseClient, articles)

  for (const article of articles) {
    if (!article.title || !article.url) continue

    // Determine category
    const categoryId = getCategoryIdForArticle(article, category, categoryMap)
    
    // Get source ID - ensure we have a fallback
    let sourceId = sourceMap[article.source?.name || ''] || sourceMap['Unknown']
    
    if (!sourceId) {
      console.warn('No source found for article, skipping:', article.title)
      continue
    }

    // Check if article already exists
    const { data: existingArticle } = await supabaseClient
      .from('news_articles')
      .select('id')
      .eq('url', article.url)
      .single()

    if (existingArticle) continue // Skip if already exists

    // Insert new article
    const { error } = await supabaseClient
      .from('news_articles')
      .insert({
        title: article.title,
        description: article.description,
        url: article.url,
        image_url: article.urlToImage,
        published_at: article.publishedAt,
        author: article.author,
        content: article.content,
        source_id: sourceId,
        category_id: categoryId,
        tags: extractTags(article),
        is_featured: Math.random() < 0.1 // 10% chance of being featured
      })

    if (error) {
      console.error('Error inserting article:', error)
    }
  }
}

async function ensureCategories(supabaseClient: any): Promise<Record<string, string>> {
  const categories = [
    { name: 'Politics', icon: 'Vote', color_class: 'bg-blue-500' },
    { name: 'Economy', icon: 'TrendingUp', color_class: 'bg-green-500' },
    { name: 'Environment', icon: 'Leaf', color_class: 'bg-emerald-500' },
    { name: 'Health', icon: 'Heart', color_class: 'bg-red-500' },
    { name: 'Technology', icon: 'Cpu', color_class: 'bg-purple-500' },
    { name: 'World', icon: 'Globe', color_class: 'bg-orange-500' }
  ]

  const categoryMap: Record<string, string> = {}

  for (const category of categories) {
    const { data, error } = await supabaseClient
      .from('news_categories')
      .upsert(category, { onConflict: 'name' })
      .select('id, name')
      .single()

    if (!error && data) {
      categoryMap[data.name.toLowerCase()] = data.id
    }
  }

  return categoryMap
}

async function ensureSources(supabaseClient: any, articles: NewsAPIArticle[]): Promise<Record<string, string>> {
  const sourceMap: Record<string, string> = {}
  const uniqueSources = [...new Set(articles.map(a => a.source.name).filter(Boolean))]

  // Add Unknown source as fallback first
  const { data: unknownSource } = await supabaseClient
    .from('news_sources')
    .upsert({
      name: 'Unknown',
      domain: 'unknown.com',
      is_verified: false,
      is_active: true
    }, { onConflict: 'name' })
    .select('id')
    .single()

  if (unknownSource) {
    sourceMap['Unknown'] = unknownSource.id
  }

  for (const sourceName of uniqueSources) {
    if (!sourceName) continue

    // Extract domain from first article with this source
    const sampleArticle = articles.find(a => a.source.name === sourceName)
    const domain = extractDomain(sampleArticle?.url || '')
    
    const { data, error } = await supabaseClient
      .from('news_sources')
      .upsert({
        name: sourceName,
        domain: domain,
        is_verified: true,
        is_active: true
      }, { onConflict: 'name' })
      .select('id, name')
      .single()

    if (!error && data) {
      sourceMap[data.name] = data.id
    } else {
      console.error('Error upserting source:', sourceName, error)
    }
  }

  return sourceMap
}

function getCategoryIdForArticle(article: NewsAPIArticle, requestedCategory: string, categoryMap: Record<string, string>): string {
  // If specific category was requested, use it
  if (requestedCategory && requestedCategory !== 'all' && categoryMap[requestedCategory]) {
    return categoryMap[requestedCategory]
  }

  // Try to determine category from content
  const text = `${article.title} ${article.description || ''}`.toLowerCase()
  
  if (text.includes('election') || text.includes('government') || text.includes('politics')) {
    return categoryMap['politics']
  }
  if (text.includes('economy') || text.includes('market') || text.includes('business')) {
    return categoryMap['economy'] 
  }
  if (text.includes('climate') || text.includes('environment') || text.includes('green')) {
    return categoryMap['environment']
  }
  if (text.includes('health') || text.includes('medical') || text.includes('hospital')) {
    return categoryMap['health']
  }
  if (text.includes('technology') || text.includes('tech') || text.includes('ai')) {
    return categoryMap['technology']
  }

  // Default to world
  return categoryMap['world'] || Object.values(categoryMap)[0]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'unknown.com'
  }
}

function extractTags(article: NewsAPIArticle): string[] {
  const text = `${article.title} ${article.description || ''}`.toLowerCase()
  const tags = []
  
  if (text.includes('breaking')) tags.push('breaking')
  if (text.includes('urgent')) tags.push('urgent')
  if (text.includes('exclusive')) tags.push('exclusive')
  
  return tags
}

async function insertMockNews(supabaseClient: any) {
  console.log('Inserting mock news data...')
  
  // Ensure categories exist first
  const categoryMap = await ensureCategories(supabaseClient)
  
  // Create mock source
  const { data: mockSource } = await supabaseClient
    .from('news_sources')
    .upsert({
      name: 'Mock News Source',
      domain: 'mocknews.com',
      is_verified: true,
      is_active: true
    }, { onConflict: 'name' })
    .select('id')
    .single()

  const sourceId = mockSource?.id

  const mockArticles = [
    {
      title: "Global Climate Summit Reaches Historic Agreement",
      description: "World leaders unite on ambitious climate targets for 2030",
      url: "https://example.com/climate-summit",
      image_url: "https://images.unsplash.com/photo-1569163139394-de44cb5894ce?w=800",
      category: 'environment'
    },
    {
      title: "New AI Breakthrough Revolutionizes Healthcare",
      description: "Revolutionary AI system shows 95% accuracy in early disease detection",
      url: "https://example.com/ai-healthcare",
      image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800",
      category: 'technology'
    },
    {
      title: "Global Markets React to Economic Policy Changes",
      description: "Stock markets surge following announcement of new trade agreements",
      url: "https://example.com/markets-react",
      image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
      category: 'economy'
    }
  ]

  for (const article of mockArticles) {
    await supabaseClient
      .from('news_articles')
      .upsert({
        ...article,
        published_at: new Date().toISOString(),
        author: 'Mock Author',
        source_id: sourceId,
        category_id: categoryMap[article.category],
        tags: ['mock', 'sample'],
        is_featured: true
      }, { onConflict: 'url' })
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Mock data inserted successfully',
      articlesProcessed: mockArticles.length
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}