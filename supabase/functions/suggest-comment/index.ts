import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postContent, postTitle, groupName, categoryName } = await req.json();

    console.log('Generating comment suggestion for post:', { postTitle, groupName, categoryName });

    const systemPrompt = 'You are a helpful assistant that suggests thoughtful, engaging comments for social media posts. Keep comments concise (2-3 sentences), relevant, and conversational.';
    const userPrompt = `Suggest a thoughtful comment for this post:
Title: ${postTitle}
Content: ${postContent}
Group: ${groupName}
Category: ${categoryName}

Generate a single engaging comment that adds value to the discussion.`;

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, response.statusText);
      console.error('Error details:', errorText);
      console.error('Request URL:', response.url);
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestion', details: errorText }), 
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ suggestion }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suggest-comment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
