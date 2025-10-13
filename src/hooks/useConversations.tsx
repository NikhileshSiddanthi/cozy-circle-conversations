import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  is_edited: boolean;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  last_message_at: string | null;
  participants: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      console.log('🔄 Fetching conversations for user:', user?.id);
      
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation:conversations (
            id,
            is_group,
            name,
            last_message_at
          )
        `)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Conversations fetch error:', error);
        throw error;
      }
      
      console.log('Raw conversations data:', data);

      const convIds = data.map((d: any) => d.conversation.id);
      
      const { data: participantsData, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          profile:profiles(display_name, avatar_url)
        `)
        .in('conversation_id', convIds);

      if (partError) {
        console.error('❌ Participants fetch error:', partError);
        throw partError;
      }
      
      console.log('Participants data:', participantsData);

      const result = data.map((d: any) => ({
        ...d.conversation,
        participants: participantsData
          .filter((p: any) => p.conversation_id === d.conversation.id)
          .map((p: any) => ({
            user_id: p.user_id,
            display_name: p.profile.display_name,
            avatar_url: p.profile.avatar_url,
          })),
      })).sort((a: any, b: any) => {
        // Sort by last_message_at, most recent first
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      }) as Conversation[];
      
      console.log('✅ Processed conversations:', result);
      return result;
    },
    enabled: !!user,
  });

  const createConversation = useMutation({
    mutationFn: async (participantIds: string[]) => {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: participantIds.length > 1,
          created_by: user?.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      const participants = [user?.id, ...participantIds].map((id) => ({
        conversation_id: conv.id,
        user_id: id,
      }));

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) throw partError;

      return conv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create conversation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set up realtime subscription for new conversations and updates
  useEffect(() => {
    if (!user) return;

    const participantChannel = supabase
      .channel('conversation-participant-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    const conversationChannel = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          // Update the specific conversation's last_message_at
          queryClient.setQueryData(['conversations', user.id], (old: Conversation[] = []) => {
            return old.map(conv => 
              conv.id === payload.new.id 
                ? { ...conv, last_message_at: payload.new.last_message_at }
                : conv
            ).sort((a, b) => {
              const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bTime - aTime;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(conversationChannel);
    };
  }, [user, queryClient]);

  return {
    conversations,
    isLoading,
    createConversation,
  };
};
