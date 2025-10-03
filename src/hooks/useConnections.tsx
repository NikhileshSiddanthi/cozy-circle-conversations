import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  requester?: {
    display_name: string;
    avatar_url: string | null;
  };
  recipient?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export const useConnections = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          requester:profiles!connections_requester_id_fkey(display_name, avatar_url),
          recipient:profiles!connections_recipient_id_fkey(display_name, avatar_url)
        `)
        .or(`requester_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!user,
  });

  const sendRequest = useMutation({
    mutationFn: async (recipientId: string) => {
      const { data, error } = await supabase
        .from('connections')
        .insert({
          requester_id: user?.id,
          recipient_id: recipientId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({ title: 'Connection request sent!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConnectionStatus }) => {
      const { error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({ title: 'Connection updated!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update connection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const acceptedConnections = connections.filter((c) => c.status === 'accepted');
  const pendingRequests = connections.filter(
    (c) => c.status === 'pending' && c.recipient_id === user?.id
  );

  return {
    connections,
    acceptedConnections,
    pendingRequests,
    isLoading,
    sendRequest,
    updateConnection,
  };
};
