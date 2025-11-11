import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef, useState } from 'react';
import { Message } from './useConversations';
import { toast } from 'sonner';

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, Message>>(new Map());
  const processedMessageIds = useRef(new Set<string>());

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch sender profiles separately
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', senderIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id),
      })) as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ 
      content, 
      attachment_url, 
      attachment_name,
      attachment_size,
      content_type 
    }: { 
      content: string; 
      attachment_url?: string;
      attachment_name?: string;
      attachment_size?: number;
      content_type?: string;
    }) => {
      if (!conversationId || !user?.id) {
        throw new Error('No conversation selected or user not authenticated');
      }

      // Create optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        media_url: attachment_url || null,
        media_type: content_type || null,
        is_edited: false,
        created_at: new Date().toISOString(),
        sender: {
          display_name: user.user_metadata?.display_name || 'You',
          avatar_url: user.user_metadata?.avatar_url || null,
        },
      };

      // Add to optimistic messages
      setOptimisticMessages(prev => new Map(prev).set(tempId, optimisticMessage));

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content,
            attachment_url,
            attachment_name,
            attachment_size,
            content_type: content_type || 'text',
          })
          .select()
          .single();

        if (error) throw error;

        // Remove optimistic message and add real one
        setOptimisticMessages(prev => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });

        return data;
      } catch (error) {
        // Remove failed optimistic message
        setOptimisticMessages(prev => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast.error('Failed to send message', {
        description: error.message,
      });
    },
  });

  // Set up realtime subscription for new messages with deduplication
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const messageId = payload.new.id;
          
          // Deduplicate: Check if we've already processed this message
          if (processedMessageIds.current.has(messageId)) return;
          processedMessageIds.current.add(messageId);

          // Fetch sender profile for new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', payload.new.sender_id)
            .single();

          const newMessage: Message = {
            ...payload.new as any,
            sender: profile ? {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            } : undefined,
          };

          queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => {
            // Check if message already exists
            if (old.some(msg => msg.id === messageId)) return old;
            return [...old, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      processedMessageIds.current.clear();
    };
  }, [conversationId, queryClient]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (!conversationId || !user || messages.length === 0) return;

    const markAsRead = async () => {
      await supabase.rpc('mark_conversation_read', {
        p_user_id: user.id,
        p_conversation_id: conversationId,
      });
    };

    // Mark as read after a short delay
    const timeout = setTimeout(markAsRead, 500);
    return () => clearTimeout(timeout);
  }, [conversationId, user, messages.length]);

  // Combine real messages with optimistic messages
  const allMessages = [
    ...messages,
    ...Array.from(optimisticMessages.values()),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    messages: allMessages,
    isLoading,
    sendMessage,
  };
};
