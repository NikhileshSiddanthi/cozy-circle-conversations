import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const method = req.method

    console.log(`Cleanup - ${method} ${url.pathname}`)

    // GET /cleanup-orphaned-media - List orphaned uploads for admin review
    if (method === 'GET') {
      const hoursOld = parseInt(url.searchParams.get('hours') || '24')
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - hoursOld)

      const { data: orphanedMedia, error } = await supabaseClient
        .from('draft_media')
        .select('*')
        .in('status', ['uploaded', 'pending'])
        .lt('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching orphaned media:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch orphaned media' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          orphanedMedia,
          count: orphanedMedia.length,
          cutoffTime: cutoffTime.toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // POST /cleanup-orphaned-media - Clean up orphaned uploads
    if (method === 'POST') {
      const hoursOld = parseInt(url.searchParams.get('hours') || '24')
      const dryRun = url.searchParams.get('dryRun') === 'true'
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - hoursOld)

      // Get orphaned media files
      const { data: orphanedMedia, error: fetchError } = await supabaseClient
        .from('draft_media')
        .select('id, file_id, url, user_id, created_at')
        .in('status', ['uploaded', 'pending'])
        .lt('created_at', cutoffTime.toISOString())

      if (fetchError) {
        console.error('Error fetching orphaned media:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch orphaned media' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!orphanedMedia || orphanedMedia.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No orphaned media found',
            cleaned: 0,
            dryRun
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      let cleanedCount = 0
      const errors: string[] = []

      if (!dryRun) {
        // Delete media records
        const { error: deleteError } = await supabaseClient
          .from('draft_media')
          .delete()
          .in('id', orphanedMedia.map(m => m.id))

        if (deleteError) {
          console.error('Error deleting orphaned media records:', deleteError)
          errors.push(`Database cleanup failed: ${deleteError.message}`)
        } else {
          cleanedCount = orphanedMedia.length
        }

        // Delete files from storage
        const filesToDelete = orphanedMedia.map(m => m.file_id)
        const { error: storageError } = await supabaseClient.storage
          .from('post-files')
          .remove(filesToDelete)

        if (storageError) {
          console.warn('Some files could not be deleted from storage:', storageError)
          errors.push(`Storage cleanup warnings: ${storageError.message}`)
        }
      }

      console.log(`Cleanup completed:`, { 
        found: orphanedMedia.length,
        cleaned: cleanedCount,
        dryRun,
        errors: errors.length
      })

      return new Response(
        JSON.stringify({ 
          found: orphanedMedia.length,
          cleaned: cleanedCount,
          dryRun,
          errors,
          cutoffTime: cutoffTime.toISOString(),
          orphanedMedia: dryRun ? orphanedMedia : undefined
        }),
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