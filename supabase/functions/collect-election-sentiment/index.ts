import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
const TWITTER_BEARER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Collecting election-related content from Twitter/X and local news sources...');

    const electionKeywords = [
      'Jubilee Hills election',
      'Hyderabad Jubilee Hills',
      'Naveen Yadav BRS',
      'Maganti Sunitha Congress',
      'Lankala Deepak BJP',
      'Azharuddin AIMIM',
      'Rajendra Prasad Jubilee Hills'
    ];

    const allTexts: string[] = [];
    const sources: string[] = [];
    let articlesAnalyzed = 0;

    // 1. Fetch from Twitter/X API v2
    if (TWITTER_BEARER_TOKEN) {
      try {
        console.log('Fetching tweets from Twitter/X API...');
        const twitterQuery = '(Jubilee Hills election) OR (Naveen Yadav) OR (Maganti Sunitha) OR (Lankala Deepak) OR (Hyderabad MLA) -is:retweet lang:en';
        
        const twitterResponse = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(twitterQuery)}&max_results=100&tweet.fields=created_at,public_metrics,lang`,
          {
            headers: {
              'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
            }
          }
        );

        if (twitterResponse.ok) {
          const twitterData = await twitterResponse.json();
          if (twitterData.data && Array.isArray(twitterData.data)) {
            console.log(`Found ${twitterData.data.length} tweets`);
            articlesAnalyzed += twitterData.data.length;
            twitterData.data.forEach((tweet: any) => {
              if (tweet.text && tweet.text.length > 20) {
                allTexts.push(tweet.text);
              }
            });
            sources.push('Twitter/X');
          }
        } else {
          const errorText = await twitterResponse.text();
          console.error('Twitter API error:', twitterResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching Twitter data:', error);
      }
    }

    // 2. Fetch from local Hyderabad news sources
    const localNewsSources = [
      {
        name: 'Telangana Today',
        searchUrl: `https://telanganatoday.com/?s=${encodeURIComponent('Jubilee Hills election')}`,
      },
      {
        name: 'The Hans India',
        searchUrl: `https://www.thehansindia.com/search?q=${encodeURIComponent('Jubilee Hills')}`,
      },
      {
        name: 'Deccan Chronicle Hyderabad',
        searchUrl: `https://www.deccanchronicle.com/search?q=${encodeURIComponent('Jubilee Hills election')}`,
      }
    ];

    for (const newsSource of localNewsSources) {
      try {
        console.log(`Fetching from ${newsSource.name}...`);
        const response = await fetch(newsSource.searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JubileeHillsElectionBot/1.0)',
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Extract text content from common HTML patterns
          const headlineMatches = html.matchAll(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi);
          const paragraphMatches = html.matchAll(/<p[^>]*>(.*?)<\/p>/gi);
          
          let extractedCount = 0;
          for (const match of headlineMatches) {
            const text = match[1].replace(/<[^>]*>/g, '').trim();
            if (text.length > 30 && extractedCount < 20) {
              allTexts.push(text);
              extractedCount++;
            }
          }
          
          for (const match of paragraphMatches) {
            const text = match[1].replace(/<[^>]*>/g, '').trim();
            if (text.length > 50 && extractedCount < 30) {
              allTexts.push(text);
              extractedCount++;
            }
          }
          
          if (extractedCount > 0) {
            sources.push(newsSource.name);
            articlesAnalyzed += extractedCount;
            console.log(`Extracted ${extractedCount} texts from ${newsSource.name}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${newsSource.name}:`, error);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Fetch from NewsAPI with India focus
    if (NEWS_API_KEY) {
      for (const keyword of electionKeywords.slice(0, 3)) {
        try {
          console.log(`Fetching NewsAPI for: ${keyword}`);
          
          const newsResponse = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword + ' Hyderabad')}&language=en&sortBy=publishedAt&pageSize=20`,
            {
              headers: {
                'X-Api-Key': NEWS_API_KEY,
              }
            }
          );

          if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            if (newsData.articles) {
              articlesAnalyzed += newsData.articles.length;
              newsData.articles.forEach((article: any) => {
                if (article.title) allTexts.push(article.title);
                if (article.description) allTexts.push(article.description);
                if (article.source?.name && !sources.includes(article.source.name)) {
                  sources.push(article.source.name);
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching NewsAPI for ${keyword}:`, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 4. Fetch from Google News RSS with India focus
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent('Jubilee Hills Hyderabad election OR Naveen Yadav OR Maganti Sunitha')}&hl=en-IN&gl=IN&ceid=IN:en`;
      const rssResponse = await fetch(rssUrl);
      
      if (rssResponse.ok) {
        const rssText = await rssResponse.text();
        const titleMatches = rssText.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
        let count = 0;
        for (const match of titleMatches) {
          if (match[1] && match[1].length > 10 && count < 20) {
            allTexts.push(match[1]);
            count++;
          }
        }
        if (count > 0) {
          if (!sources.includes('Google News India')) {
            sources.push('Google News India');
          }
          articlesAnalyzed += count;
        }
      }
    } catch (error) {
      console.error('Error fetching Google News RSS:', error);
    }

    console.log(`Collected ${allTexts.length} texts from ${sources.length} sources`);
    console.log(`Sources: ${sources.join(', ')}`);

    if (allTexts.length === 0) {
      console.log('No election-related content found from external sources');
      return new Response(
        JSON.stringify({ 
          message: 'No election-related content found from external sources',
          processed: 0,
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 100 texts for analysis
    const textsToAnalyze = allTexts.slice(0, 100);

    console.log(`Analyzing ${textsToAnalyze.length} texts...`);

    // Call the analyze-sentiment function with candidate names for prediction
    const { data: sentimentResult, error: sentimentError } = await supabaseClient.functions.invoke(
      'analyze-sentiment',
      {
        body: {
          texts: textsToAnalyze,
          election_slug: 'jubilee-hills-2025',
          sources,
          total_articles_analyzed: articlesAnalyzed,
          candidates: [
            { name: 'Naveen Yadav', party: 'BRS' },
            { name: 'Maganti Sunitha', party: 'Congress' },
            { name: 'Lankala Deepak', party: 'BJP' },
            { name: 'Azharuddin', party: 'AIMIM' },
            { name: 'Rajendra Prasad', party: 'Independent' }
          ]
        }
      }
    );

    if (sentimentError) {
      console.error('Error analyzing sentiment:', sentimentError);
      throw sentimentError;
    }

    console.log('Sentiment analysis and prediction completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        processed: textsToAnalyze.length,
        total_found: allTexts.length,
        articles_analyzed: articlesAnalyzed,
        sources,
        sentiment: sentimentResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in collect-election-sentiment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});