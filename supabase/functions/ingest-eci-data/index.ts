import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ECIPayload {
  constituency_id: string;
  round_number?: number;
  party_votes: Record<string, number>;
  total_counted: number;
  form20_url?: string;
  timestamp?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { constituency_id, round_number, party_votes, total_counted, form20_url, timestamp }: ECIPayload = await req.json();

    console.log(`[ECI Ingest] Processing data for ${constituency_id}, Round ${round_number}`);

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    // Step 1: Store raw event (immutable audit log)
    const { data: rawEvent, error: rawError } = await supabase
      .from('election_raw_events')
      .insert({
        source: 'eci',
        constituency_id,
        source_payload: {
          round_number,
          party_votes,
          total_counted,
          form20_url,
        },
        event_time: eventTime.toISOString(),
        processed: false,
      })
      .select()
      .single();

    if (rawError) {
      console.error('[ECI Ingest] Raw event error:', rawError);
      throw rawError;
    }

    console.log('[ECI Ingest] Raw event stored:', rawEvent.id);

    // Step 2: Create normalized count entry
    const { data: countEntry, error: countError } = await supabase
      .from('election_counts')
      .insert({
        constituency_id,
        source: 'eci',
        kind: 'official',
        round_number,
        data: {
          party_votes,
          total_counted,
        },
        form20_url,
        verified: true, // ECI is authoritative
      })
      .select()
      .single();

    if (countError) {
      console.error('[ECI Ingest] Count entry error:', countError);
      throw countError;
    }

    console.log('[ECI Ingest] Count entry created:', countEntry.id);

    // Step 3: Update canonical state (reconciliation)
    const leadingParty = Object.entries(party_votes).reduce((a, b) => 
      party_votes[a[0]] > party_votes[b[0]] ? a : b
    )[0];

    const { data: canonical, error: canonicalError } = await supabase
      .from('election_canonical')
      .upsert({
        constituency_id,
        last_update: new Date().toISOString(),
        canonical_data: {
          party_votes,
          total_counted,
          round_number,
          form20_url,
        },
        source: 'eci',
        total_counted,
        leading_party: leadingParty,
        status: 'counting',
      }, {
        onConflict: 'constituency_id',
      })
      .select()
      .single();

    if (canonicalError) {
      console.error('[ECI Ingest] Canonical update error:', canonicalError);
      throw canonicalError;
    }

    // Mark raw event as processed
    await supabase
      .from('election_raw_events')
      .update({ processed: true })
      .eq('id', rawEvent.id);

    console.log('[ECI Ingest] Canonical state updated:', canonical.constituency_id);

    return new Response(
      JSON.stringify({
        success: true,
        raw_event_id: rawEvent.id,
        count_id: countEntry.id,
        canonical: canonical,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[ECI Ingest] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
