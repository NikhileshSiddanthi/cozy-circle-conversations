import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Private IP ranges to prevent SSRF
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fd[0-9a-f][0-9a-f]:/
];

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface LinkPreview {
  url: string;
  url_hash: string;
  title?: string;
  description?: string;
  image_url?: string;
  provider?: string;
  embed_html?: string;
  content_type?: string;
  favicon_url?: string;
  fetched_at: string;
  fetch_error?: string;
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Resolve hostname to IP and check against private ranges
    try {
      const response = await fetch(`https://dns.google/resolve?name=${urlObj.hostname}&type=A`);
      const dnsData = await response.json();
      
      if (dnsData.Answer) {
        for (const answer of dnsData.Answer) {
          const ip = answer.data;
          for (const range of PRIVATE_IP_RANGES) {
            if (range.test(ip)) {
              console.log(`Blocked private IP: ${ip} for ${url}`);
              return false;
            }
          }
        }
      }
    } catch (dnsError) {
      console.warn(`DNS resolution failed for ${urlObj.hostname}, proceeding with caution`);
    }

    return true;
  } catch {
    return false;
  }
}

function extractVideoId(url: string): string | null {
  // Clean and normalize the URL first - remove all whitespace and newlines
  const cleanUrl = url.replace(/[\s\n\r]+/g, '').trim();
  
  // More robust patterns that handle query parameters and fragments
  const patterns = [
    // youtu.be format with optional query params: https://youtu.be/VIDEO_ID or https://youtu.be/VIDEO_ID?list=...
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/,
    // youtube.com/watch format: https://youtube.com/watch?v=VIDEO_ID&...
    /(?:youtube\.com\/watch\?.*[?&]v=)([a-zA-Z0-9_-]{11})(?:[&#]|$)/,
    // youtube.com/watch format without extra params
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/,
    // youtube.com/embed format
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/,
    // youtube.com/v format
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      // YouTube video IDs are exactly 11 characters
      if (videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
        console.log(`✅ Extracted video ID: ${videoId} from URL: ${cleanUrl}`);
        return videoId;
      }
    }
  }
  
  console.warn(`❌ Could not extract video ID from URL: ${cleanUrl}`);
  return null;
}

function isYouTubeUrl(url: string): boolean {
  // Clean URL first and check
  const cleanUrl = url.replace(/\s+/g, '').trim();
  return /(?:youtube\.com|youtu\.be)/.test(cleanUrl);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
        ...options.headers,
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchYouTubePreview(url: string): Promise<Partial<LinkPreview>> {
  // Clean the URL first
  const cleanUrl = url.replace(/\s+/g, '').trim();
  const videoId = extractVideoId(cleanUrl);
  
  if (!videoId) throw new Error('Invalid YouTube URL');

  console.log(`Extracted YouTube video ID: ${videoId} from URL: ${cleanUrl}`);

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
  
  try {
    console.log(`Fetching YouTube oEmbed from: ${oembedUrl}`);
    const response = await fetchWithTimeout(oembedUrl);
    if (!response.ok) throw new Error(`YouTube oEmbed failed: ${response.status}`);
    
    const data = await response.json();
    console.log('YouTube oEmbed response:', data);
    
    return {
      title: data.title,
      description: `${data.author_name} • YouTube`,
      image_url: data.thumbnail_url,
      provider: 'youtube',
      content_type: 'video',
      embed_html: `<iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"></iframe>`
    };
  } catch (error) {
    console.error('YouTube oEmbed error:', error);
    // Fallback to high-quality thumbnail URLs
    return {
      title: `YouTube Video`,
      description: `Watch on YouTube`,
      image_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      provider: 'youtube',
      content_type: 'video',
      embed_html: `<iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"></iframe>`
    };
  }
}

function extractMetadata(html: string, url: string): Partial<LinkPreview> {
  // Extract Open Graph and meta tags with better fallback logic
  const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i) ||
                    html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"[^>]*>/i) ||
                    html.match(/<title[^>]*>([^<]*)<\/title>/i);
  
  const descriptionMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
  
  // Try multiple image sources with priority
  const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                    html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                    html.match(/<meta[^>]*property="twitter:image:src"[^>]*content="([^"]*)"[^>]*>/i);
  
  const typeMatch = html.match(/<meta[^>]*property="og:type"[^>]*content="([^"]*)"[^>]*>/i);
  
  const urlObj = new URL(url);
  let image_url = imageMatch?.[1]?.trim();
  
  // Convert relative URLs to absolute
  if (image_url && !image_url.startsWith('http')) {
    if (image_url.startsWith('//')) {
      image_url = urlObj.protocol + image_url;
    } else if (image_url.startsWith('/')) {
      image_url = `${urlObj.protocol}//${urlObj.hostname}${image_url}`;
    } else {
      image_url = `${urlObj.protocol}//${urlObj.hostname}/${image_url}`;
    }
  }
  
  const favicon_url = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  
  return {
    title: titleMatch?.[1]?.trim() || urlObj.hostname,
    description: descriptionMatch?.[1]?.trim() || `Visit ${urlObj.hostname}`,
    image_url: image_url || favicon_url,
    provider: 'generic',
    content_type: typeMatch?.[1]?.trim() || 'website',
    favicon_url
  };
}

async function fetchGenericPreview(url: string): Promise<Partial<LinkPreview>> {
  try {
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      const urlObj = new URL(url);
      return {
        title: urlObj.hostname,
        description: `Link to ${urlObj.hostname}`,
        provider: 'generic',
        content_type: 'link',
        favicon_url: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
      };
    }

    // Limit body size to prevent huge downloads
    const reader = response.body?.getReader();
    let html = '';
    let totalBytes = 0;
    const maxBytes = 2 * 1024 * 1024; // 2MB limit

    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            console.warn(`Response too large for ${url}, truncating`);
            break;
          }
          
          html += new TextDecoder().decode(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    return extractMetadata(html, url);
  } catch (error) {
    console.error(`Generic preview error for ${url}:`, error);
    const urlObj = new URL(url);
    return {
      title: urlObj.hostname,
      description: `Link to ${urlObj.hostname}`,
      provider: 'generic',
      content_type: 'link',
      favicon_url: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`,
      fetch_error: error.message
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean and validate URL
    const cleanUrl = url.replace(/\s+/g, '').trim();
    if (!await validateUrl(cleanUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or blocked URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url_hash = await sha256(cleanUrl);
    console.log(`Processing URL: ${cleanUrl}, Hash: ${url_hash}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for cached preview
    const { data: cached, error: cacheError } = await supabase
      .from('link_previews')
      .select('*')
      .eq('url_hash', url_hash)
      .single();

    if (!cacheError && cached) {
      const cacheAge = new Date().getTime() - new Date(cached.fetched_at).getTime();
      if (cacheAge < TTL_MS) {
        console.log(`Returning cached preview for ${url}`);
        return new Response(
          JSON.stringify(cached),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch new preview
    console.log(`Fetching new preview for ${cleanUrl}`);
    let previewData: Partial<LinkPreview>;

    if (isYouTubeUrl(cleanUrl)) {
      previewData = await fetchYouTubePreview(cleanUrl);
    } else {
      previewData = await fetchGenericPreview(cleanUrl);
    }

    const preview: LinkPreview = {
      url: cleanUrl,
      url_hash,
      fetched_at: new Date().toISOString(),
      ...previewData
    };

    // Save to cache
    const { error: saveError } = await supabase
      .from('link_previews')
      .upsert(preview, { onConflict: 'url_hash' });

    if (saveError) {
      console.error('Failed to save preview:', saveError);
    }

    return new Response(
      JSON.stringify(preview),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Link preview function error:', error);
    
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