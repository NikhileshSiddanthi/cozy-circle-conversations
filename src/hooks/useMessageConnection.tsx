import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useMessageConnection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createConversationAndNavigate = useMutation({
    mutationFn: async (recipientId: string) => {
      console.log('💬 Creating/finding conversation:', { userId: user?.id, recipientId });
      
      // Check if conversation already exists
      const { data: existingConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user?.id);
      
      console.log('Existing conversations:', existingConversations);

      if (existingConversations && existingConversations.length > 0) {
        const conversationIds = existingConversations.map(c => c.conversation_id);
        
        // Check if recipient is in any of these conversations
        const { data: recipientConversations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', recipientId)
          .in('conversation_id', conversationIds);

        if (recipientConversations && recipientConversations.length > 0) {
          // Conversation already exists
          return recipientConversations[0].conversation_id;
        }
      }

      // Create new conversation
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (convError) {
        console.error('❌ Conversation creation error:', convError);
        throw convError;
      }
      
      console.log('✅ Conversation created:', conv);

      // Add participants
      const participants = [
        { conversation_id: conv.id, user_id: user?.id },
        { conversation_id: conv.id, user_id: recipientId }
      ];

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) {
        console.error('❌ Participants insert error:', partError);
        throw partError;
      }
      
      console.log('✅ Participants added');

      return conv.id;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      navigate('/messages', { state: { selectedConversation: conversationId } });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start conversation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { createConversationAndNavigate };
};
