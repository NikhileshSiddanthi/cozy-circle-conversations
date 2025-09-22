import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeUpdates } from './useRealtimeUpdates';

interface VisitorStats {
  totalVisits: number;
  liveUsers: number;
}

export const useVisitorTracking = () => {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisits: 0,
    liveUsers: 0
  });

  // Track visitor count from database
  useEffect(() => {
    const fetchVisitorStats = async () => {
      const { data } = await supabase
        .from('visitor_stats')
        .select('total_visits')
        .single();
      
      if (data) {
        setStats(prev => ({ ...prev, totalVisits: data.total_visits }));
      }
    };

    fetchVisitorStats();
  }, []);

  // Track live users using Supabase presence
  useEffect(() => {
    const channel = supabase.channel('live-users');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const liveUserCount = Object.keys(state).length;
        setStats(prev => ({ ...prev, liveUsers: liveUserCount }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setStats(prev => ({ ...prev, liveUsers: prev.liveUsers + newPresences.length }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setStats(prev => ({ ...prev, liveUsers: Math.max(0, prev.liveUsers - leftPresences.length) }));
      })
      .subscribe();

    // Track this user as online
    const trackPresence = async () => {
      await channel.track({
        user_id: crypto.randomUUID(),
        online_at: new Date().toISOString(),
      });
    };

    trackPresence();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen to visitor stats updates
  useRealtimeUpdates({
    table: 'visitor_stats',
    event: 'UPDATE',
    onUpdate: (payload) => {
      if (payload.new) {
        setStats(prev => ({ ...prev, totalVisits: payload.new.total_visits }));
      }
    }
  });

  // Increment visitor count on mount
  useEffect(() => {
    const incrementVisit = async () => {
      try {
        await supabase.rpc('increment_visitor_count');
      } catch (error) {
        console.error('Error tracking visit:', error);
      }
    };

    incrementVisit();
  }, []);

  return stats;
};