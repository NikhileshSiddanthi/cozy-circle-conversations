import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UrlMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  canonicalUrl?: string;
  error?: string;
}

const extractMetadata = (html: string, url: string): UrlMetadata => {
  // Extract Open Graph and basic meta tags
  const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i) ||
                    html.match(/<title[^>]*>([^<]*)<\/title>/i);
  
  const descriptionMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
  
  const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
  
  const siteNameMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i);
  
  const canonicalMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i);

  return {
    url,
    title: titleMatch?.[1]?.trim() || new URL(url).hostname,
    description: descriptionMatch?.[1]?.trim() || '',
    image: imageMatch?.[1]?.trim() || '',
    siteName: siteNameMatch?.[1]?.trim() || new URL(url).hostname,
    canonicalUrl: canonicalMatch?.[1]?.trim() || url
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response(
        JSON.stringify({ 
          url,
          error: 'Invalid URL format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching metadata for: ${targetUrl.href}`);

    // Fetch the webpage
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(targetUrl.href, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; URLPreview/1.0; +https://yoursite.com/bot)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`HTTP ${response.status} for ${targetUrl.href}`);
        return new Response(
          JSON.stringify({
            url,
            title: targetUrl.hostname,
            description: `Link to ${targetUrl.hostname}`,
            siteName: targetUrl.hostname,
            canonicalUrl: url,
            error: `HTTP ${response.status}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        console.log(`Non-HTML content type: ${contentType}`);
        return new Response(
          JSON.stringify({
            url,
            title: targetUrl.hostname,
            description: `Link to ${targetUrl.hostname}`,
            siteName: targetUrl.hostname,
            canonicalUrl: url
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const html = await response.text();
      const metadata = extractMetadata(html, url);

      console.log(`Successfully extracted metadata for ${targetUrl.href}:`, {
        title: metadata.title,
        hasDescription: !!metadata.description,
        hasImage: !!metadata.image
      });

      return new Response(
        JSON.stringify(metadata),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.log(`Timeout fetching ${targetUrl.href}`);
      } else {
        console.error(`Fetch error for ${targetUrl.href}:`, fetchError);
      }

      // Return a fallback response
      return new Response(
        JSON.stringify({
          url,
          title: targetUrl.hostname,
          description: `Link to ${targetUrl.hostname}`,
          siteName: targetUrl.hostname,
          canonicalUrl: url,
          error: 'Could not fetch page metadata'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('URL metadata function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});