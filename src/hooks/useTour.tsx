import { useCallback } from 'react';
import { TOUR_CONFIG } from '@/lib/tour/config';

/**
 * Hook to programmatically control the tour
 */
export const useTour = () => {
  const start = useCallback((stepIndex = 0) => {
    if (typeof (window as any).startAppTour === 'function') {
      (window as any).startAppTour(stepIndex);
    } else {
      console.warn('[useTour] Tour manager not initialized');
    }
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(TOUR_CONFIG.COMPLETED_KEY);
    sessionStorage.removeItem(TOUR_CONFIG.STORAGE_KEY);
  }, []);

  const pause = useCallback(() => {
    // Store current step for resuming
    const currentStep = sessionStorage.getItem(TOUR_CONFIG.STORAGE_KEY);
    if (currentStep) {
      console.log('[useTour] Tour paused at step:', currentStep);
    }
  }, []);

  const resume = useCallback(() => {
    const savedStep = sessionStorage.getItem(TOUR_CONFIG.STORAGE_KEY);
    if (savedStep) {
      start(parseInt(savedStep, 10));
    } else {
      start(0);
    }
  }, [start]);

  const hasCompleted = useCallback(() => {
    return !!localStorage.getItem(TOUR_CONFIG.COMPLETED_KEY);
  }, []);

  return {
    start,
    pause,
    resume,
    reset,
    hasCompleted,
  };
};
