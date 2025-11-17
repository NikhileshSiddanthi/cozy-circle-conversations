import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExitPollPayload {
  provider: string;
  constituency_id: string;
  sample_size: number;
  methodology: string;
  predicted_winner: string;
  vote_share: Record<string, number>;
  confidence: number;
  margin_of_error: number;
  published_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ExitPollPayload = await req.json();

    console.log(`[Exit Poll Ingest] Processing ${payload.provider} for ${payload.constituency_id}`);

    // Store raw event for audit
    const { error: rawError } = await supabase
      .from('election_raw_events')
      .insert({
        source: 'exitpoll',
        constituency_id: payload.constituency_id,
        source_payload: payload,
        event_time: payload.published_at || new Date().toISOString(),
        processed: false,
      });

    if (rawError) {
      console.error('[Exit Poll Ingest] Raw event error:', rawError);
      throw rawError;
    }

    // Insert exit poll
    const { data: exitPoll, error: exitPollError } = await supabase
      .from('exit_polls')
      .insert({
        provider: payload.provider,
        constituency_id: payload.constituency_id,
        sample_size: payload.sample_size,
        methodology: payload.methodology,
        predicted_winner: payload.predicted_winner,
        vote_share: payload.vote_share,
        confidence: payload.confidence,
        margin_of_error: payload.margin_of_error,
        raw: payload,
        published_at: payload.published_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (exitPollError) {
      console.error('[Exit Poll Ingest] Insert error:', exitPollError);
      throw exitPollError;
    }

    console.log('[Exit Poll Ingest] Exit poll stored:', exitPoll.id);

    return new Response(
      JSON.stringify({
        success: true,
        exit_poll_id: exitPoll.id,
        data: exitPoll,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Exit Poll Ingest] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
