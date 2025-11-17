import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from 'https://esm.sh/linkedom@0.14.12';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ECIResult {
  candidateName: string;
  party: string;
  votes: number;
}

async function scrapeECIResults(constituencyCode: string): Promise<ECIResult[] | null> {
  try {
    // ECI results page URL pattern
    const eciUrl = `https://results.eci.gov.in/ResultAcGenNov2025/ConstituencywiseS02${constituencyCode}.htm`;
    
    console.log(`[ECI Scraper] Fetching from: ${eciUrl}`);
    
    const response = await fetch(eciUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.log(`[ECI Scraper] ECI page not available yet (${response.status})`);
      return null;
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Parse results table (ECI uses consistent table structure)
    const results: ECIResult[] = [];
    const rows = doc.querySelectorAll('table tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const candidateName = cells[0]?.textContent?.trim();
        const party = cells[1]?.textContent?.trim();
        const votesText = cells[2]?.textContent?.trim().replace(/,/g, '');
        
        if (candidateName && party && votesText) {
          const votes = parseInt(votesText);
          if (!isNaN(votes)) {
            results.push({ candidateName, party, votes });
          }
        }
      }
    }

    console.log(`[ECI Scraper] Parsed ${results.length} candidate results`);
    return results.length > 0 ? results : null;
    
  } catch (error) {
    console.error('[ECI Scraper] Error scraping ECI:', error);
    return null;
  }
}

async function ingestResults(supabase: any, constituencyId: string, results: ECIResult[], roundNumber: number) {
  const partyVotes: Record<string, number> = {};
  let totalVotes = 0;

  for (const result of results) {
    partyVotes[result.party] = result.votes;
    totalVotes += result.votes;
  }

  // Store raw event
  await supabase.from('election_raw_events').insert({
    source: 'eci',
    constituency_id: constituencyId,
    source_payload: { results, round_number: roundNumber },
    event_time: new Date().toISOString(),
    processed: false,
  });

  // Create normalized count
  await supabase.from('election_counts').insert({
    constituency_id: constituencyId,
    source: 'eci',
    kind: 'official',
    round_number: roundNumber,
    data: { party_votes: partyVotes, total_counted: totalVotes },
    verified: true,
  });

  // Update canonical state
  const leadingParty = Object.entries(partyVotes).reduce((a, b) => 
    partyVotes[a[0]] > partyVotes[b[0]] ? a : b
  )[0];

  await supabase.from('election_canonical').upsert({
    constituency_id: constituencyId,
    last_update: new Date().toISOString(),
    canonical_data: { party_votes: partyVotes, total_counted: totalVotes, round_number: roundNumber },
    source: 'eci',
    total_counted: totalVotes,
    leading_party: leadingParty,
    status: 'counting',
  }, { onConflict: 'constituency_id' });

  console.log(`[ECI Scraper] Ingested round ${roundNumber}: ${totalVotes} total votes`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { constituency_id = 'jubilee-hills-2025', eci_code = '901' } = await req.json().catch(() => ({}));

    console.log(`[ECI Scraper] Starting scrape for ${constituency_id} (ECI: ${eci_code})`);

    // Scrape ECI website
    const results = await scrapeECIResults(eci_code);

    if (!results) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No data available from ECI yet - counting may not have started',
          scraped_at: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get current round number
    const { data: existingCounts } = await supabase
      .from('election_counts')
      .select('round_number')
      .eq('constituency_id', constituency_id)
      .eq('source', 'eci')
      .order('round_number', { ascending: false })
      .limit(1);

    const nextRound = existingCounts?.[0]?.round_number ? existingCounts[0].round_number + 1 : 1;

    // Ingest results
    await ingestResults(supabase, constituency_id, results, nextRound);

    return new Response(
      JSON.stringify({
        success: true,
        constituency_id,
        round: nextRound,
        candidates_count: results.length,
        total_votes: results.reduce((sum, r) => sum + r.votes, 0),
        scraped_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[ECI Scraper] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
