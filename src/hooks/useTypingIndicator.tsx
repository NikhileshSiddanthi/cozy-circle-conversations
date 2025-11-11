import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingState {
  userId: string;
  displayName: string;
  isTyping: boolean;
}

export const useTypingIndicator = (conversationId: string | null) => {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingEventRef = useRef<number>(0);

  const sendTypingEvent = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !user) return;

    // Throttle typing events to max once per 2 seconds
    const now = Date.now();
    if (isTyping && now - lastTypingEventRef.current < 2000) return;
    
    lastTypingEventRef.current = now;

    channelRef.current.track({
      user_id: user.id,
      display_name: user.user_metadata?.display_name || 'User',
      is_typing: isTyping,
      timestamp: now,
    });
  }, [user]);

  const startTyping = useCallback(() => {
    sendTypingEvent(true);
    
    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false);
    }, 3000);
  }, [sendTypingEvent]);

  const stopTyping = useCallback(() => {
    sendTypingEvent(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [sendTypingEvent]);

  const getTypingUsers = useCallback((): TypingState[] => {
    if (!channelRef.current || !user) return [];

    const presenceState = channelRef.current.presenceState();
    const typingUsers: TypingState[] = [];

    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        if (
          presence.user_id !== user.id &&
          presence.is_typing &&
          Date.now() - presence.timestamp < 3000
        ) {
          typingUsers.push({
            userId: presence.user_id,
            displayName: presence.display_name,
            isTyping: true,
          });
        }
      });
    });

    return typingUsers;
  }, [user]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'User',
          is_typing: false,
          timestamp: Date.now(),
        });
      }
    });

    return () => {
      stopTyping();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user, stopTyping]);

  return {
    startTyping,
    stopTyping,
    getTypingUsers,
  };
};
