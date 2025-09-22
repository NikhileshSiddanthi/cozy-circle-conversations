import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeUpdates } from './useRealtimeUpdates';

interface VisitorStats {
  total_visits: number;
  unique_visitors: number;
  updated_at: string;
}

export const useVisitorTracking = () => {
  const [stats, setStats] = useState<VisitorStats>({
    total_visits: 0,
    unique_visitors: 0,
    updated_at: new Date().toISOString()
  });
  const [liveUsers, setLiveUsers] = useState(0);
  const [isTracked, setIsTracked] = useState(false);

  // Track live users using Supabase presence
  useEffect(() => {
    const channel = supabase.channel('live-users');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.keys(newState).length;
        setLiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const newState = channel.presenceState();
        const users = Object.keys(newState).length;
        setLiveUsers(users);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const newState = channel.presenceState();
        const users = Object.keys(newState).length;
        setLiveUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const presenceTrackStatus = await channel.track({
            user_id: Math.random().toString(36).substring(7),
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch initial visitor stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('visitor_stats')
          .select('*')
          .single();

        if (error) {
          console.error('Error fetching visitor stats:', error);
          return;
        }

        if (data) {
          setStats({
            total_visits: data.total_visits,
            unique_visitors: data.unique_visitors,
            updated_at: data.updated_at
          });
        }
      } catch (error) {
        console.error('Error fetching visitor stats:', error);
      }
    };

    fetchStats();
  }, []);

  // Track visitor on mount (only once per session)
  useEffect(() => {
    const trackVisitor = async () => {
      if (isTracked) return;

      try {
        const { error } = await supabase.rpc('increment_visitor_count');
        
        if (error) {
          console.error('Error tracking visitor:', error);
          return;
        }

        setIsTracked(true);
      } catch (error) {
        console.error('Error tracking visitor:', error);
      }
    };

    // Delay tracking by 2 seconds to ensure real engagement
    const timer = setTimeout(trackVisitor, 2000);
    return () => clearTimeout(timer);
  }, [isTracked]);

  // Listen for real-time updates to visitor stats
  useRealtimeUpdates({
    table: 'visitor_stats',
    event: 'UPDATE',
    onUpdate: (payload) => {
      if (payload.new) {
        setStats({
          total_visits: payload.new.total_visits,
          unique_visitors: payload.new.unique_visitors,
          updated_at: payload.new.updated_at
        });
      }
    }
  });

  return {
    totalVisitors: stats.total_visits,
    uniqueVisitors: stats.unique_visitors,
    liveUsers,
    lastUpdated: stats.updated_at
  };
};