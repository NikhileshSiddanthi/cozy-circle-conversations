import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Collecting election-related posts and comments...');

    // Election keywords to filter relevant content
    const electionKeywords = [
      'jubilee hills',
      'election',
      'vote',
      'candidate',
      'naveen yadav',
      'maganti sunitha',
      'lankala deepak',
      'azharuddin',
      'rajendra prasad',
      'polling',
      'ballot'
    ];

    // Build search query for posts
    const keywordPattern = electionKeywords.join('|');

    // Fetch recent posts (last 7 days) with election keywords
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: posts, error: postsError } = await supabaseClient
      .from('posts')
      .select('content, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(100);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      throw postsError;
    }

    console.log(`Fetched ${posts?.length || 0} recent posts`);

    // Fetch recent comments (last 7 days)
    const { data: comments, error: commentsError } = await supabaseClient
      .from('comments')
      .select('content, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(100);

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw commentsError;
    }

    console.log(`Fetched ${comments?.length || 0} recent comments`);

    // Combine and filter text content
    const allTexts = [
      ...(posts || []).map(p => p.content),
      ...(comments || []).map(c => c.content)
    ].filter(text => {
      // Filter for election-related content
      const lowerText = text.toLowerCase();
      return electionKeywords.some(keyword => lowerText.includes(keyword));
    });

    console.log(`Found ${allTexts.length} election-related texts`);

    if (allTexts.length === 0) {
      console.log('No election-related content found');
      return new Response(
        JSON.stringify({ 
          message: 'No election-related content found',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 50 most recent texts to avoid overwhelming the sentiment API
    const textsToAnalyze = allTexts.slice(0, 50);

    console.log(`Analyzing ${textsToAnalyze.length} texts...`);

    // Call the analyze-sentiment function
    const { data: sentimentResult, error: sentimentError } = await supabaseClient.functions.invoke(
      'analyze-sentiment',
      {
        body: {
          texts: textsToAnalyze,
          election_slug: 'jubilee-hills'
        }
      }
    );

    if (sentimentError) {
      console.error('Error analyzing sentiment:', sentimentError);
      throw sentimentError;
    }

    console.log('Sentiment analysis completed successfully');
    console.log('Results:', sentimentResult);

    return new Response(
      JSON.stringify({
        success: true,
        processed: textsToAnalyze.length,
        total_found: allTexts.length,
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