import { useCallback } from 'react';
import { toast } from 'sonner';

export const useErrorHandler = () => {
  const handleError = useCallback((error: Error | unknown, context?: string) => {
    console.error('Error occurred:', error, context ? `Context: ${context}` : '');
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const title = context ? `${context} Failed` : 'Error';
    
    toast.error(title, {
      description: message,
      duration: 5000,
    });
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
};