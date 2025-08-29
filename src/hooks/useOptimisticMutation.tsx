import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from './useErrorHandler';
import { toast } from 'sonner';

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: (string | number)[];
  optimisticUpdate?: (oldData: any, variables: TVariables) => any;
  successMessage?: string;
  errorContext?: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export const useOptimisticMutation = <TData, TVariables>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  successMessage,
  errorContext,
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TVariables>) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      if (!optimisticUpdate) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => optimisticUpdate(old, variables));

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      handleError(error, errorContext);
      onError?.(error as Error, variables);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      onSuccess?.(data, variables);
    },
  });
};