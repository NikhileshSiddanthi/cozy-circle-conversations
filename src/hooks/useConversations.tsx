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

      if (error) throw error;

      const convIds = data.map((d: any) => d.conversation.id);
      
      const { data: participantsData, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          profile:profiles(display_name, avatar_url)
        `)
        .in('conversation_id', convIds);

      if (partError) throw partError;

      return data.map((d: any) => ({
        ...d.conversation,
        participants: participantsData
          .filter((p: any) => p.conversation_id === d.conversation.id)
          .map((p: any) => ({
            user_id: p.user_id,
            display_name: p.profile.display_name,
            avatar_url: p.profile.avatar_url,
          })),
      })) as Conversation[];
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

  // Set up realtime subscription for new conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversation-changes')
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    conversations,
    isLoading,
    createConversation,
  };
};
