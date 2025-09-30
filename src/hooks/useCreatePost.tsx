import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimisticMutation } from './useOptimisticMutation';

interface CreatePostVariables {
  draftId: string;
  visibility?: 'public' | 'group' | 'private';
  linkPreview?: any;
}

interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  group_id: string;
  created_at: string;
  like_count: number;
  comment_count: number;
}

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useOptimisticMutation<any, CreatePostVariables>({
    mutationFn: async ({ draftId, visibility = 'public', linkPreview }) => {
      const { data, error } = await supabase.functions.invoke('publish-post', {
        body: { draftId, visibility, linkPreview }
      });

      if (error) throw error;
      return data;
    },
    queryKey: ['posts'],
    optimisticUpdate: (oldData: any, variables) => {
      // We'll add the optimistic post to the feed
      // In a real scenario, we'd construct a temporary post object
      return oldData;
    },
    successMessage: 'Post published successfully!',
    errorContext: 'Failed to publish post',
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
};
