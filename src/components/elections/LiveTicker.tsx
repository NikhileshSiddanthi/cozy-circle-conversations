import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface TickerEvent {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: 'count' | 'projection' | 'alert';
}

export const LiveTicker = ({ constituencyId }: { constituencyId: string }) => {
  const [events, setEvents] = useState<TickerEvent[]>([]);

  useEffect(() => {
    // Fetch recent events
    const fetchEvents = async () => {
      const { data: counts } = await supabase
        .from('election_counts')
        .select('*')
        .eq('constituency_id', constituencyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (counts) {
        const tickerEvents: TickerEvent[] = counts.map((count) => {
          const data = count.data as any;
          const parties = Object.entries(data.party_votes || {});
          const message = parties
            .map(([party, votes]) => `${party} ${votes}`)
            .join(', ');

          return {
            id: count.id,
            timestamp: count.created_at,
            source: count.source.toUpperCase(),
            message: `Round ${data.round_number || '?'} — ${message} — Total: ${data.total_counted}`,
            type: count.kind === 'official' ? 'count' : 'projection',
          };
        });

        setEvents(tickerEvents);
      }
    };

    fetchEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('election-ticker')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'election_counts',
          filter: `constituency_id=eq.${constituencyId}`,
        },
        (payload) => {
          const newCount = payload.new as any;
          const data = newCount.data as any;
          const parties = Object.entries(data.party_votes || {});
          const message = parties
            .map(([party, votes]) => `${party} ${votes}`)
            .join(', ');

          const newEvent: TickerEvent = {
            id: newCount.id,
            timestamp: newCount.created_at,
            source: newCount.source.toUpperCase(),
            message: `Round ${data.round_number || '?'} — ${message} — Total: ${data.total_counted}`,
            type: newCount.kind === 'official' ? 'count' : 'projection',
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [constituencyId]);

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Live Updates</h3>
        <Badge variant="secondary" className="ml-auto animate-pulse">
          <span className="h-2 w-2 rounded-full bg-green-500 mr-2 inline-block" />
          LIVE
        </Badge>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border-l-4 border-primary pl-3 py-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <Badge variant={event.type === 'count' ? 'default' : 'secondary'} className="text-xs">
                  {event.source}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(event.timestamp), 'HH:mm:ss')}
                </span>
              </div>
              <p className="text-sm">{event.message}</p>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for live updates...</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
