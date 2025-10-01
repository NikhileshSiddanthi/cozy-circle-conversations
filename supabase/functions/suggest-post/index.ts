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
    const { groupName, groupDescription, categoryName, userPrompt } = await req.json();

    console.log('Generating post suggestion for:', { groupName, categoryName, userPrompt });

    const systemPrompt = 'You are a helpful assistant that suggests engaging social media posts. Create relevant, concise posts (2-4 paragraphs) that fit the group context and encourage discussion.';
    const prompt = `Suggest a post for this group:
Group: ${groupName}
Group Description: ${groupDescription || 'No description'}
Category: ${categoryName}
${userPrompt ? `User wants to post about: ${userPrompt}` : 'Generate a general engaging post topic for this group'}

Generate a post with a title and content that would spark discussion.`;

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
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
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
    console.error('Error in suggest-post function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
