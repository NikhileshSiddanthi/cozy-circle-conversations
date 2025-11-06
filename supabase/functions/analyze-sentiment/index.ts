import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_API_KEY = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, election_slug = 'jubilee-hills-2025' } = await req.json();

    if (!texts || !Array.isArray(texts)) {
      return new Response(
        JSON.stringify({ error: 'texts array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze sentiment using Hugging Face
    const sentimentResults = await Promise.all(
      texts.map(async (text: string) => {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: text }),
          }
        );

        if (!response.ok) {
          console.error('HF API error:', await response.text());
          return null;
        }

        const result = await response.json();
        // Result format: [[{label: 'POSITIVE', score: 0.9}]]
        return result[0];
      })
    );

    // Extract topics using zero-shot classification
    const topicResults = await Promise.all(
      texts.map(async (text: string) => {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: text,
              parameters: {
                candidate_labels: [
                  'water and drainage',
                  'roads and infrastructure',
                  'education',
                  'health facilities',
                  'environment',
                  'safety and security',
                  'employment',
                  'housing'
                ],
              },
            }),
          }
        );

        if (!response.ok) {
          return null;
        }

        const result = await response.json();
        return result;
      })
    );

    // Aggregate results
    let positive = 0, neutral = 0, negative = 0;
    const topicCounts: Record<string, number> = {};

    sentimentResults.forEach((result) => {
      if (!result) return;
      const topLabel = result.reduce((prev: any, curr: any) => 
        curr.score > prev.score ? curr : prev
      );
      
      if (topLabel.label === 'POSITIVE') positive++;
      else if (topLabel.label === 'NEGATIVE') negative++;
      else neutral++;
    });

    topicResults.forEach((result) => {
      if (!result || !result.labels) return;
      const topTopic = result.labels[0];
      topicCounts[topTopic] = (topicCounts[topTopic] || 0) + 1;
    });

    // Convert topics to array format
    const topics = Object.entries(topicCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / texts.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Store in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { error } = await supabase
      .from('elections_sentiment_snapshots')
      .insert({
        election_slug,
        area: 'Jubilee Hills',
        total: texts.length,
        positive,
        neutral,
        negative,
        topics,
        period_start: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
      });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store sentiment data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentiment: { positive, neutral, negative, total: texts.length },
        topics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
