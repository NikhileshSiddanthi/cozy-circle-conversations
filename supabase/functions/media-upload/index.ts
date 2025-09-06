import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MediaUploadCompleteData {
  draftId: string
  fileId: string
  url: string
  mimeType?: string
  fileSize?: number
}

interface MediaAttachData {
  draftId: string
  mediaIds: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.log('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const method = req.method
    const pathSegments = url.pathname.split('/').filter(Boolean)

    console.log(`Media Upload - ${method} ${url.pathname}`, {
      userId: user.id,
      pathSegments
    })

    // POST /media-upload/complete - Mark upload as complete and attach to draft
    if (method === 'POST' && pathSegments.includes('complete')) {
      const body: MediaUploadCompleteData = await req.json()

      // Validate required fields
      if (!body.draftId || !body.fileId || !body.url) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: draftId, fileId, url' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify draft exists and belongs to user
      const { data: draft, error: draftError } = await supabaseClient
        .from('post_drafts')
        .select('id, user_id')
        .eq('id', body.draftId)
        .eq('user_id', user.id)
        .single()

      if (draftError || !draft) {
        console.error('Draft not found or unauthorized:', draftError)
        return new Response(
          JSON.stringify({ error: 'Draft not found or unauthorized' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create draft_media record
      const { data: media, error: mediaError } = await supabaseClient
        .from('draft_media')
        .insert({
          draft_id: body.draftId,
          user_id: user.id,
          file_id: body.fileId,
          url: body.url,
          mime_type: body.mimeType,
          file_size: body.fileSize,
          status: 'uploaded'
        })
        .select()
        .single()

      if (mediaError) {
        console.error('Error creating draft media record:', mediaError)
        return new Response(
          JSON.stringify({ error: 'Failed to attach media to draft' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Media attached to draft:', { 
        mediaId: media.id, 
        draftId: body.draftId, 
        fileId: body.fileId 
      })

      return new Response(
        JSON.stringify({ media }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // POST /media-upload/attach - Attach existing uploaded files to draft
    if (method === 'POST' && pathSegments.includes('attach')) {
      const body: MediaAttachData = await req.json()

      if (!body.draftId || !body.mediaIds || body.mediaIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: draftId, mediaIds' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify ownership of media files and attach to draft
      const { data: updatedMedia, error: attachError } = await supabaseClient
        .from('draft_media')
        .update({ 
          draft_id: body.draftId,
          status: 'uploaded',
          updated_at: new Date().toISOString()
        })
        .in('id', body.mediaIds)
        .eq('user_id', user.id)
        .select()

      if (attachError) {
        console.error('Error attaching media to draft:', attachError)
        return new Response(
          JSON.stringify({ error: 'Failed to attach media to draft' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ media: updatedMedia }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // GET /media-upload/temp - Get temporary uploads (not attached to any draft)
    if (method === 'GET' && pathSegments.includes('temp')) {
      const { data: tempMedia, error } = await supabaseClient
        .from('draft_media')
        .select('*')
        .eq('user_id', user.id)
        .is('draft_id', null)
        .eq('status', 'uploaded')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching temp media:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch temp media' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ media: tempMedia }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // DELETE /media-upload/:id - Remove media file
    if (method === 'DELETE' && pathSegments.length >= 3) {
      const mediaId = pathSegments[2]

      // Get media info first
      const { data: media, error: fetchError } = await supabaseClient
        .from('draft_media')
        .select('file_id, url, status')
        .eq('id', mediaId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !media) {
        return new Response(
          JSON.stringify({ error: 'Media not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Don't allow deletion of attached media
      if (media.status === 'attached') {
        return new Response(
          JSON.stringify({ error: 'Cannot delete attached media' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete from database
      const { error: deleteError } = await supabaseClient
        .from('draft_media')
        .delete()
        .eq('id', mediaId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error deleting media record:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete media' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete from storage
      const { error: storageError } = await supabaseClient.storage
        .from('post-files')
        .remove([media.file_id])

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})