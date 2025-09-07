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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, draftId, fileId, order } = await req.json();

    if (!action || !draftId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: action, draftId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Handle list action
    if (action === 'list') {
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('draft_media')
        .select('id, file_id, url, thumbnail_url, mime_type, file_size, order_index')
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

      // Transform to match expected interface
      const transformedFiles = (mediaFiles || []).map(file => ({
        fileId: file.id,
        url: file.url,
        thumbnailUrl: file.thumbnail_url,
        mimeType: file.mime_type,
        size: file.file_size,
        orderIndex: file.order_index,
      }));

      return new Response(JSON.stringify(transformedFiles), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle delete action
    if (action === 'delete') {
      if (!fileId) {
        return new Response(JSON.stringify({ error: 'Missing fileId for delete action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle reorder action
    if (action === 'reorder') {
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

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
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