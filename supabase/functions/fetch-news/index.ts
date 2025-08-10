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

    // Build NewsAPI URL with India prioritization and recent date filtering
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const fromDate = yesterday.toISOString().split('T')[0] // YYYY-MM-DD format
    
    let newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&pageSize=50&language=en&country=in&from=${fromDate}`
    
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
      // For search queries, use everything endpoint but prioritize Indian sources and recent dates
      newsApiUrl = `https://newsapi.org/v2/everything?apiKey=${newsApiKey}&q=${encodeURIComponent(query)}&pageSize=50&language=en&sortBy=publishedAt&from=${fromDate}&sources=the-times-of-india,the-hindu,indian-express,ndtv,zee-news,india-today,business-standard,economic-times`
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
  // First, clean up old articles (older than 2 days)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  
  await supabaseClient
    .from('news_articles')
    .delete()
    .lt('published_at', twoDaysAgo.toISOString())

  console.log(`Cleaned up articles older than ${twoDaysAgo.toISOString()}`)

  // Get or create categories and sources first
  const categoryMap = await ensureCategories(supabaseClient)
  const sourceMap = await ensureSources(supabaseClient, articles)

  for (const article of articles) {
    if (!article.title || !article.url) continue

    // Only process articles published within the last 24 hours
    const articleDate = new Date(article.publishedAt)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    if (articleDate < oneDayAgo) {
      console.log(`Skipping old article: ${article.title} (${article.publishedAt})`)
      continue
    }

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
    { name: 'Politics', icon: 'Vote', color_class: 'bg-blue-500', description: 'Indian politics, elections, and governance' },
    { name: 'Economy', icon: 'TrendingUp', color_class: 'bg-green-500', description: 'Business, markets, and economic news from India' },
    { name: 'Environment', icon: 'Leaf', color_class: 'bg-emerald-500', description: 'Climate, pollution, and environmental issues' },
    { name: 'Health', icon: 'Heart', color_class: 'bg-red-500', description: 'Healthcare, medical breakthroughs, and wellness' },
    { name: 'Technology', icon: 'Cpu', color_class: 'bg-purple-500', description: 'Tech innovation, startups, and digital India' },
    { name: 'World', icon: 'Globe', color_class: 'bg-orange-500', description: 'International news affecting India' }
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

  // Try to determine category from content with Indian context
  const text = `${article.title} ${article.description || ''}`.toLowerCase()
  
  // Enhanced Indian context categorization
  if (text.includes('election') || text.includes('modi') || text.includes('parliament') || text.includes('bjp') || text.includes('congress') || text.includes('politics') || text.includes('government') || text.includes('minister')) {
    return categoryMap['politics']
  }
  if (text.includes('economy') || text.includes('rupee') || text.includes('market') || text.includes('business') || text.includes('nse') || text.includes('sensex') || text.includes('rbi') || text.includes('inflation')) {
    return categoryMap['economy'] 
  }
  if (text.includes('climate') || text.includes('environment') || text.includes('pollution') || text.includes('green') || text.includes('delhi air') || text.includes('monsoon')) {
    return categoryMap['environment']
  }
  if (text.includes('health') || text.includes('medical') || text.includes('hospital') || text.includes('covid') || text.includes('vaccine') || text.includes('ayush')) {
    return categoryMap['health']
  }
  if (text.includes('technology') || text.includes('tech') || text.includes('ai') || text.includes('startup') || text.includes('digital india') || text.includes('it sector')) {
    return categoryMap['technology']
  }

  // Default to world for international or unclassified news
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
  
  // Indian context tags
  if (text.includes('breaking')) tags.push('breaking')
  if (text.includes('urgent')) tags.push('urgent')
  if (text.includes('exclusive')) tags.push('exclusive')
  if (text.includes('india') || text.includes('indian')) tags.push('india')
  if (text.includes('delhi') || text.includes('mumbai') || text.includes('bangalore') || text.includes('chennai') || text.includes('kolkata')) tags.push('metro')
  if (text.includes('modi') || text.includes('pm ') || text.includes('prime minister')) tags.push('leadership')
  
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
      title: "India's GDP Growth Accelerates to 8.2% in Q3, Exceeds Expectations",
      description: "India's economy shows robust growth driven by manufacturing and services sectors",
      url: "https://example.com/india-gdp-growth-" + Date.now(),
      image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
      category: 'economy',
      published_at: new Date().toISOString() // Current time
    },
    {
      title: "Digital India Initiative Reaches 1 Billion Citizens with UPI Transactions",
      description: "Revolutionary digital payment system transforms India's financial landscape",
      url: "https://example.com/digital-india-upi-" + Date.now(),
      image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800",
      category: 'technology',
      published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      title: "Monsoon Forecast: India Expects Normal Rainfall This Season",
      description: "IMD predicts favorable monsoon conditions for agricultural productivity",
      url: "https://example.com/monsoon-forecast-" + Date.now(),
      image_url: "https://images.unsplash.com/photo-1569163139394-de44cb5894ce?w=800",
      category: 'environment',
      published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
    },
    {
      title: "India Launches Mission to Mars: ISRO's Ambitious Space Program",
      description: "Indian Space Research Organisation achieves new milestone in space exploration",
      url: "https://example.com/india-mars-mission-" + Date.now(),
      image_url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800",
      category: 'technology',
      published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
    }
  ]

  for (const article of mockArticles) {
    await supabaseClient
      .from('news_articles')
      .upsert({
        ...article,
        author: 'COZI News Team',
        source_id: sourceId,
        category_id: categoryMap[article.category],
        tags: ['mock', 'india', 'latest'],
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