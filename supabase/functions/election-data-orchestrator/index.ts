import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Election Data Orchestrator
 * Coordinates all data collection functions for comprehensive election coverage
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Orchestrator] Starting comprehensive data collection...');

    const results = {
      eci_scraper: { status: 'pending', data: null as any },
      news_analysis: { status: 'pending', data: null as any },
      twitter_monitor: { status: 'pending', data: null as any },
      started_at: new Date().toISOString(),
    };

    // 1. Scrape ECI official results
    try {
      console.log('[Orchestrator] Calling ECI scraper...');
      const eciResponse = await supabase.functions.invoke('eci-auto-scraper', {
        body: { constituency_id: 'jubilee-hills-2025', eci_code: '901' },
      });
      results.eci_scraper = { 
        status: eciResponse.error ? 'error' : 'success', 
        data: eciResponse.data 
      };
    } catch (error) {
      results.eci_scraper = { status: 'error', data: { error: error.message } };
      console.error('[Orchestrator] ECI scraper error:', error);
    }

    // 2. Analyze news with AI
    try {
      console.log('[Orchestrator] Calling news analyzer...');
      const newsResponse = await supabase.functions.invoke('analyze-election-news', {
        body: { 
          constituency_id: 'jubilee-hills-2025',
          election_query: 'Jubilee Hills by-election 2025 Hyderabad Telangana'
        },
      });
      results.news_analysis = { 
        status: newsResponse.error ? 'error' : 'success', 
        data: newsResponse.data 
      };
    } catch (error) {
      results.news_analysis = { status: 'error', data: { error: error.message } };
      console.error('[Orchestrator] News analyzer error:', error);
    }

    // 3. Monitor Twitter sentiment
    try {
      console.log('[Orchestrator] Calling Twitter monitor...');
      const twitterResponse = await supabase.functions.invoke('twitter-election-monitor', {
        body: { 
          constituency_id: 'jubilee-hills-2025',
          search_query: 'Jubilee Hills election OR #JubileeHillsElection OR Telangana by-election'
        },
      });
      results.twitter_monitor = { 
        status: twitterResponse.error ? 'error' : 'success', 
        data: twitterResponse.data 
      };
    } catch (error) {
      results.twitter_monitor = { status: 'error', data: { error: error.message } };
      console.error('[Orchestrator] Twitter monitor error:', error);
    }

    const successCount = Object.values(results).filter(r => r.status === 'success').length - 1; // -1 for started_at
    const totalTasks = 3;

    console.log(`[Orchestrator] Completed: ${successCount}/${totalTasks} tasks successful`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        completed_at: new Date().toISOString(),
        summary: {
          total_tasks: totalTasks,
          successful: successCount,
          failed: totalTasks - successCount,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
