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
    const { texts, election_slug = 'jubilee-hills-2025', sources = [], total_articles_analyzed = 0, candidates = [] } = await req.json();

    if (!texts || !Array.isArray(texts)) {
      return new Response(
        JSON.stringify({ error: 'texts array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${texts.length} texts for sentiment and predictions...`);

    // Analyze sentiment using Hugging Face
    const sentimentResults = await Promise.all(
      texts.map(async (text: string) => {
        const response = await fetch(
          'https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment',
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
        return { result: result[0], text };
      })
    );

    // Extract topics using zero-shot classification
    const topicResults = await Promise.all(
      texts.map(async (text: string) => {
        const response = await fetch(
          'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli',
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

    // Aggregate sentiment results
    let positive = 0, neutral = 0, negative = 0;
    const topicCounts: Record<string, number> = {};

    sentimentResults.forEach((result) => {
      if (!result) return;
      const topLabel = result.result.reduce((prev: any, curr: any) => 
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

    // PREDICTION LOGIC: Analyze candidate mentions and sentiment
    const candidateMentions: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
    
    if (candidates.length > 0) {
      candidates.forEach((candidate: any) => {
        candidateMentions[candidate.name] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      });

      sentimentResults.forEach((result) => {
        if (!result) return;
        const text = result.text.toLowerCase();
        const topLabel = result.result.reduce((prev: any, curr: any) => 
          curr.score > prev.score ? curr : prev
        );

        candidates.forEach((candidate: any) => {
          if (text.includes(candidate.name.toLowerCase())) {
            candidateMentions[candidate.name].total++;
            if (topLabel.label === 'POSITIVE') candidateMentions[candidate.name].positive++;
            else if (topLabel.label === 'NEGATIVE') candidateMentions[candidate.name].negative++;
            else candidateMentions[candidate.name].neutral++;
          }
        });
      });
    }

    // Calculate prediction scores
    const candidateScores = Object.entries(candidateMentions).map(([name, mentions]) => {
      const sentiment_score = mentions.total > 0 
        ? ((mentions.positive * 2) + mentions.neutral - mentions.negative) / mentions.total
        : 0;
      const visibility_score = mentions.total / texts.length;
      const combined_score = (sentiment_score * 0.6) + (visibility_score * 100 * 0.4);
      
      return {
        name,
        mentions: mentions.total,
        positive_mentions: mentions.positive,
        negative_mentions: mentions.negative,
        neutral_mentions: mentions.neutral,
        sentiment_score: Math.round(sentiment_score * 100) / 100,
        visibility_score: Math.round(visibility_score * 1000) / 10,
        combined_score: Math.round(combined_score * 100) / 100
      };
    }).sort((a, b) => b.combined_score - a.combined_score);

    // Generate prediction
    const winner = candidateScores[0];
    const runner_up = candidateScores[1];
    const confidence = winner && runner_up 
      ? Math.min(95, Math.round((winner.combined_score / (winner.combined_score + runner_up.combined_score)) * 100))
      : 50;

    const prediction_data = {
      predicted_winner: winner?.name || 'Insufficient data',
      confidence_percentage: confidence,
      reasoning: winner 
        ? `Based on ${texts.length} analyzed texts from ${sources.length} sources, ${winner.name} has the highest combined score (${winner.combined_score}) with ${winner.mentions} mentions (${winner.positive_mentions} positive, ${winner.negative_mentions} negative). Key factors: sentiment favorability (${winner.sentiment_score}) and visibility (${winner.visibility_score}%).`
        : 'Not enough data to make a prediction',
      candidate_scores: candidateScores,
      data_sources: sources,
      analysis_date: new Date().toISOString()
    };

    console.log('Prediction:', prediction_data);

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
        prediction_data,
        sources,
        total_articles_analyzed,
        period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
      });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store sentiment data', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentiment: { positive, neutral, negative, total: texts.length },
        topics,
        prediction: prediction_data,
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
