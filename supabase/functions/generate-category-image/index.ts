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
    const { name, description, type = 'category' } = await req.json();
    console.log(`Generating ${type} image for: ${name}`);

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create contextual prompt based on name and description
    const contextDescription = description ? ` ${description}` : '';
    const prompt = `Create a modern, minimalist icon for a ${type} named "${name}".${contextDescription} Style: clean vector design, solid background color, centered icon, professional look. Use vibrant colors appropriate to the topic. Square aspect ratio, high contrast.`;

    console.log("Prompt:", prompt);

    // Encode prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Call Pollinations AI image generation (no API key needed)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;
    
    console.log("Generating image from Pollinations AI...");
    
    const response = await fetch(pollinationsUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Pollinations AI error:', response.status);
      return new Response(
        JSON.stringify({ error: `AI generation failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pollinations returns the image directly, so we use the URL
    const imageUrl = pollinationsUrl;

    console.log(`Successfully generated ${type} image`);

    return new Response(
      JSON.stringify({ image_url: imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
