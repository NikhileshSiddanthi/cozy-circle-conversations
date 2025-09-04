import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onUpdate: (payload: any) => void;
}

export const useRealtimeUpdates = ({ table, event, filter, onUpdate }: RealtimeConfig) => {
  const setupRealtime = useCallback(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter
        },
        onUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, onUpdate]);

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, [setupRealtime]);
};

// Usage example:
// useRealtimeUpdates({
//   table: 'posts',
//   event: 'INSERT',
//   filter: 'group_id=eq.123',
//   onUpdate: (payload) => setNewPost(payload.new)
// });