import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DraftData {
  title?: string
  content?: string
  groupId?: string
  metadata?: any
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

    console.log(`Draft Manager - ${method} ${url.pathname}`, {
      userId: user.id,
      pathSegments
    })

    // GET /drafts - Get drafts for user/group
    if (method === 'GET' && pathSegments.length === 2) {
      const groupId = url.searchParams.get('groupId')
      const status = url.searchParams.get('status') || 'editing'

      let query = supabaseClient
        .from('post_drafts')
        .select(`
          *,
          draft_media (
            id,
            file_id,
            url,
            mime_type,
            file_size,
            status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', status)
        .order('updated_at', { ascending: false })

      if (groupId) {
        query = query.eq('group_id', groupId)
      }

      const { data: drafts, error } = await query

      if (error) {
        console.error('Error fetching drafts:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch drafts' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ drafts }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // POST /drafts - Create new draft
    if (method === 'POST' && pathSegments.length === 2) {
      const body: DraftData = await req.json()

      const { data: draft, error } = await supabaseClient
        .from('post_drafts')
        .insert({
          user_id: user.id,
          group_id: body.groupId || null,
          title: body.title || '',
          content: body.content || '',
          metadata: body.metadata || {},
          status: 'editing'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating draft:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create draft' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Draft created:', { draftId: draft.id, groupId: body.groupId })

      return new Response(
        JSON.stringify({ draft }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // PUT /drafts/:id - Update draft
    if (method === 'PUT' && pathSegments.length === 3) {
      const draftId = pathSegments[2]
      const body: DraftData = await req.json()

      const { data: draft, error } = await supabaseClient
        .from('post_drafts')
        .update({
          title: body.title,
          content: body.content,
          metadata: body.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', draftId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating draft:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update draft' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ draft }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // DELETE /drafts/:id - Delete draft and cleanup media
    if (method === 'DELETE' && pathSegments.length === 3) {
      const draftId = pathSegments[2]

      // Start transaction-like cleanup
      try {
        // Get draft media files first
        const { data: mediaFiles } = await supabaseClient
          .from('draft_media')
          .select('file_id, url')
          .eq('draft_id', draftId)
          .eq('user_id', user.id)

        // Delete draft (cascade will handle draft_media)
        const { error: draftError } = await supabaseClient
          .from('post_drafts')
          .delete()
          .eq('id', draftId)
          .eq('user_id', user.id)

        if (draftError) {
          throw draftError
        }

        // Clean up storage files
        if (mediaFiles && mediaFiles.length > 0) {
          const filesToDelete = mediaFiles.map(f => f.file_id)
          const { error: storageError } = await supabaseClient.storage
            .from('post-files')
            .remove(filesToDelete)

          if (storageError) {
            console.warn('Some files could not be deleted from storage:', storageError)
          }
        }

        console.log('Draft deleted:', { draftId, filesDeleted: mediaFiles?.length || 0 })

        return new Response(
          JSON.stringify({ success: true, filesDeleted: mediaFiles?.length || 0 }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (error) {
        console.error('Error deleting draft:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to delete draft' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
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