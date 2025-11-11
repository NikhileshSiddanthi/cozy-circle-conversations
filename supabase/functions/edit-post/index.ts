import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Robust HTML sanitization to prevent XSS attacks
 */
const sanitizeHTML = (dirty: string): string => {
  if (!dirty) return '';
  
  let clean = dirty.trim();
  
  // Remove all script tags and their contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, '');
  
  // Remove all style tags
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis, '');
  
  // Remove all iframe/embed/object tags
  clean = clean.replace(/<(iframe|embed|object|applet|meta|link|base)\b[^>]*>.*?<\/\1>/gis, '');
  clean = clean.replace(/<(iframe|embed|object|applet|meta|link|base)\b[^>]*\/>/gis, '');
  
  // Remove all event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gis, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gis, '');
  
  // Remove dangerous protocols
  clean = clean.replace(/javascript:/gis, '');
  clean = clean.replace(/data:text\/html/gis, '');
  clean = clean.replace(/vbscript:/gis, '');
  
  // Remove form tags
  clean = clean.replace(/<\/?form\b[^>]*>/gis, '');
  clean = clean.replace(/<\/?input\b[^>]*>/gis, '');
  
  // Remove SVG tags
  clean = clean.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gis, '');
  
  return clean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EditPostRequest {
  postId: string;
  title: string;
  content: string;
  media_urls?: string[];
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image_url?: string;
    provider?: string;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body: EditPostRequest = await req.json();
    const { postId, title, content, media_urls, linkPreview } = body;

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'Post ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate input lengths
    if (title.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Title must be less than 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (content && content.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Content must be less than 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize HTML to prevent XSS
    const sanitizedTitle = sanitizeHTML(title);
    const sanitizedContent = content ? sanitizeHTML(content) : '';

    // Verify post exists and user owns it
    const { data: existingPost, error: postError } = await supabase
      .from('posts')
      .select('id, user_id, metadata')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();

    if (postError || !existingPost) {
      return new Response(
        JSON.stringify({ error: 'Post not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare metadata update
    const existingMetadata = (existingPost.metadata as any) || {};
    const updatedMetadata = {
      ...existingMetadata,
      link_preview: linkPreview || undefined
    };

    // Update the post
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        title: sanitizedTitle,
        content: sanitizedContent,
        media_url: media_urls && media_urls.length > 0 ? 
          (media_urls.length === 1 ? media_urls[0] : JSON.stringify(media_urls)) : null,
        media_type: media_urls && media_urls.length > 0 ? 'image' : null,
        metadata: updatedMetadata,
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update post:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update post' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        postId: postId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edit post error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});