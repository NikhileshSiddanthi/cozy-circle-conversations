import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract draftId from path: /drafts/:draftId/media or /drafts/:draftId/mediaOrder
    const draftIndex = pathSegments.findIndex(segment => segment === 'drafts');
    if (draftIndex === -1 || draftIndex + 1 >= pathSegments.length) {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const draftId = pathSegments[draftIndex + 1];

    // Verify draft ownership
    const { data: draft, error: draftError } = await supabase
      .from('post_drafts')
      .select('id, user_id')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single();

    if (draftError || !draft) {
      return new Response(JSON.stringify({ 
        error: 'Draft not found or access denied' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle GET /drafts/:draftId/media
    if (req.method === 'GET' && pathSegments.includes('media')) {
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('draft_media')
        .select('*')
        .eq('draft_id', draftId)
        .in('status', ['uploaded', 'attached'])
        .order('order_index', { ascending: true });

      if (mediaError) {
        console.error('Media fetch error:', mediaError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch media files' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(mediaFiles || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle DELETE /drafts/:draftId/media/:fileId
    if (req.method === 'DELETE' && pathSegments.includes('media')) {
      const mediaIndex = pathSegments.findIndex(segment => segment === 'media');
      if (mediaIndex === -1 || mediaIndex + 1 >= pathSegments.length) {
        return new Response(JSON.stringify({ error: 'Missing fileId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileId = pathSegments[mediaIndex + 1];

      // Get the media record first
      const { data: mediaFile, error: findError } = await supabase
        .from('draft_media')
        .select('*')
        .eq('id', fileId)
        .eq('draft_id', draftId)
        .eq('user_id', user.id)
        .single();

      if (findError || !mediaFile) {
        return new Response(JSON.stringify({ 
          error: 'Media file not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('post-files')
        .remove([mediaFile.file_id]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('draft_media')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        return new Response(JSON.stringify({ 
          error: 'Failed to delete media file' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Reorder remaining files
      const { data: remainingFiles, error: reorderFetchError } = await supabase
        .from('draft_media')
        .select('id, order_index')
        .eq('draft_id', draftId)
        .in('status', ['uploaded', 'attached'])
        .order('order_index', { ascending: true });

      if (reorderFetchError) {
        console.error('Reorder fetch error:', reorderFetchError);
      } else if (remainingFiles && remainingFiles.length > 0) {
        // Update order_index for remaining files
        const reorderPromises = remainingFiles.map((file, index) => 
          supabase
            .from('draft_media')
            .update({ order_index: index })
            .eq('id', file.id)
        );

        await Promise.all(reorderPromises);
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle PATCH /drafts/:draftId/mediaOrder
    if (req.method === 'PATCH' && pathSegments.includes('mediaOrder')) {
      const { order } = await req.json();

      if (!Array.isArray(order)) {
        return new Response(JSON.stringify({ 
          error: 'Order must be an array of file IDs' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify all file IDs belong to this draft and user
      const { data: mediaFiles, error: verifyError } = await supabase
        .from('draft_media')
        .select('id')
        .eq('draft_id', draftId)
        .eq('user_id', user.id)
        .in('status', ['uploaded', 'attached'])
        .in('id', order);

      if (verifyError || !mediaFiles || mediaFiles.length !== order.length) {
        return new Response(JSON.stringify({ 
          error: 'Invalid file IDs in order array' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update order_index for each file
      const updatePromises = order.map((fileId, index) =>
        supabase
          .from('draft_media')
          .update({ order_index: index })
          .eq('id', fileId)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => result.error);
      if (failedUpdates.length > 0) {
        console.error('Order update errors:', failedUpdates);
        return new Response(JSON.stringify({ 
          error: 'Failed to update media order' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in draft-media function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});