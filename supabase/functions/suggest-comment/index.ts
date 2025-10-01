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

    const prompt = `You are a helpful assistant that suggests thoughtful, engaging comments for social media posts. Keep comments concise (2-3 sentences), relevant, and conversational.

Suggest a thoughtful comment for this post:
Title: ${postTitle}
Content: ${postContent}
Group: ${groupName}
Category: ${categoryName}

Generate a single engaging comment that adds value to the discussion.`;

    const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          top_p: 0.95,
        }
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
    const suggestion = data[0]?.generated_text?.replace(prompt, '').trim() || data[0]?.generated_text?.trim();

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
