import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    
    // Handle POST /uploads/init
    if (req.method === 'POST' && pathSegments.includes('init')) {
      const { filename, mimeType, size, draftId } = await req.json();

      // Validate required fields
      if (!filename || !mimeType || !size || !draftId) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: filename, mimeType, size, draftId' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate file size
      if (size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ 
          error: 'File size exceeds 10MB limit' 
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

      // Check current media count for this draft
      const { count } = await supabase
        .from('draft_media')
        .select('*', { count: 'exact', head: true })
        .eq('draft_id', draftId);

      if (count && count >= 10) {
        return new Response(JSON.stringify({ 
          error: 'Maximum 10 images allowed per draft' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate unique file ID and path
      const fileExtension = filename.split('.').pop() || 'jpg';
      const uniqueId = crypto.randomUUID();
      const filePath = `${user.id}/${user.id}_${draftId}_${uniqueId}.${fileExtension}`;

      // Create signed upload URL
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-files')
        .createSignedUploadUrl(filePath, {
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload URL creation error:', uploadError);
        return new Response(JSON.stringify({ 
          error: 'Failed to create upload URL' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store upload metadata temporarily
      const uploadId = uniqueId;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      // Store temp upload record
      const tempUpload = {
        upload_id: uploadId,
        user_id: user.id,
        draft_id: draftId,
        file_path: filePath,
        filename,
        mime_type: mimeType,
        file_size: size,
        expires_at: expiresAt,
      };

      // Store in a temporary uploads table or use a different approach
      // For now, we'll store it in draft_media with 'pending' status
      const { error: tempError } = await supabase
        .from('draft_media')
        .insert({
          id: uploadId,
          draft_id: draftId,
          user_id: user.id,
          file_id: filePath,
          url: '', // Will be filled after upload completion
          mime_type: mimeType,
          file_size: size,
          status: 'pending',
          order_index: (count || 0),
        });

      if (tempError) {
        console.error('Temp upload storage error:', tempError);
        return new Response(JSON.stringify({ 
          error: 'Failed to initialize upload' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        uploadId,
        uploadUrl: uploadData.signedUrl,
        expiresAt,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle POST /uploads/complete
    if (req.method === 'POST' && pathSegments.includes('complete')) {
      const { uploadId } = await req.json();

      if (!uploadId) {
        return new Response(JSON.stringify({ 
          error: 'Missing uploadId' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find the pending upload
      const { data: pendingUpload, error: findError } = await supabase
        .from('draft_media')
        .select('*')
        .eq('id', uploadId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (findError || !pendingUpload) {
        return new Response(JSON.stringify({ 
          error: 'Upload not found or already completed' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(pendingUpload.file_id);

      // Update the draft_media record
      const { data: completedUpload, error: updateError } = await supabase
        .from('draft_media')
        .update({
          url: urlData.publicUrl,
          status: 'uploaded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', uploadId)
        .select()
        .single();

      if (updateError) {
        console.error('Upload completion error:', updateError);
        return new Response(JSON.stringify({ 
          error: 'Failed to complete upload' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        fileId: completedUpload.id,
        url: completedUpload.url,
        thumbnailUrl: completedUpload.thumbnail_url,
        mimeType: completedUpload.mime_type,
        size: completedUpload.file_size,
        orderIndex: completedUpload.order_index,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in uploads function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});