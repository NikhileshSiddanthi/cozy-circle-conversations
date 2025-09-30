import React, { useState, useEffect, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step, ACTIONS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TOUR_STEPS, TourStep } from '@/lib/tour/steps';
import { TOUR_CONFIG, JOYRIDE_STYLES, JOYRIDE_LOCALE, getStepsForViewport } from '@/lib/tour/config';
import { waitForSelector, waitForNavigation } from '@/lib/tour/waitForSelector';

interface TourManagerProps {
  autoStart?: boolean;
  forceStart?: boolean;
  onComplete?: () => void;
}

export const TourManager: React.FC<TourManagerProps> = ({
  autoStart = false,
  forceStart = false,
  onComplete,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  
  const isNavigating = useRef(false);
  const currentRoute = useRef(location.pathname);
  const navigationRetries = useRef(0);

  // Set steps (no filtering - use all steps for consistency)
  useEffect(() => {
    setTourSteps(TOUR_STEPS);
    
    // Convert to Joyride step format
    const joyrideSteps: Step[] = TOUR_STEPS.map(step => ({
      target: step.target,
      content: step.content,
      title: step.title,
      placement: step.placement || 'auto',
      disableBeacon: step.disableBeacon || false,
      spotlightClicks: true,
      styles: {
        options: {
          width: 400,
        },
      },
    }));
    
    setSteps(joyrideSteps);
  }, []);

  // Initialize tour on mount
  useEffect(() => {
    // Don't start tour until steps are loaded
    if (tourSteps.length === 0) {
      return;
    }

    if (forceStart) {
      startTour(0);
    } else if (autoStart) {
      const hasCompleted = localStorage.getItem(TOUR_CONFIG.COMPLETED_KEY);
      if (!hasCompleted) {
        // Check if there's a saved step
        const savedStep = sessionStorage.getItem(TOUR_CONFIG.STORAGE_KEY);
        const startIndex = savedStep ? parseInt(savedStep, 10) : 0;
        
        // Delay to let page load
        setTimeout(() => startTour(startIndex), 1000);
      }
    }
  }, [autoStart, forceStart, tourSteps.length]);

  // Handle route changes during tour
  useEffect(() => {
    currentRoute.current = location.pathname;
    
    if (run && !isNavigating.current) {
      // Check if we're on the expected route for current step
      const currentStep = tourSteps[stepIndex];
      if (currentStep && currentStep.route !== location.pathname) {
        // User navigated away manually - pause tour
        console.log('[Tour] User navigated away, pausing tour');
        setRun(false);
      }
    }
  }, [location.pathname, run, stepIndex, tourSteps]);

  // Start tour function
  const startTour = useCallback(async (startIndex = 0) => {
    console.log('[Tour] Starting tour from step:', startIndex, 'total steps:', tourSteps.length);
    
    if (tourSteps.length === 0) {
      console.warn('[Tour] No tour steps available');
      return;
    }
    
    setStepIndex(startIndex);
    sessionStorage.setItem(TOUR_CONFIG.STORAGE_KEY, String(startIndex));
    
    const currentStep = tourSteps[startIndex];
    if (!currentStep) {
      console.warn('[Tour] Step not found at index:', startIndex);
      return;
    }
    
    console.log('[Tour] Starting with step:', currentStep.id, 'route:', currentStep.route, 'target:', currentStep.target);
    
    // Navigate to the step's route if needed
    if (currentStep.route !== location.pathname) {
      console.log('[Tour] Navigating to:', currentStep.route);
      isNavigating.current = true;
      navigate(currentStep.route);
      
      // Wait for navigation to complete
      const navSuccess = await waitForNavigation(currentStep.route);
      isNavigating.current = false;
      
      if (!navSuccess) {
        console.warn('[Tour] Navigation failed');
      }
      
      // Additional delay after navigation
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for target element to appear
    if (currentStep.target !== 'body') {
      console.log('[Tour] Waiting for target:', currentStep.target);
      const element = await waitForSelector(currentStep.target, TOUR_CONFIG.WAIT_TIMEOUT_MS);
      
      if (!element) {
        console.warn('[Tour] Target not found, skipping step:', currentStep.id);
        
        if (navigationRetries.current < TOUR_CONFIG.MAX_NAV_RETRIES) {
          navigationRetries.current++;
          console.log('[Tour] Retrying, attempt:', navigationRetries.current);
          // Retry with next step
          setTimeout(() => startTour(startIndex + 1), 500);
          return;
        } else {
          // Skip this step
          navigationRetries.current = 0;
          if (startIndex < tourSteps.length - 1) {
            console.log('[Tour] Max retries reached, moving to next step');
            setTimeout(() => startTour(startIndex + 1), 500);
            return;
          }
        }
      } else {
        console.log('[Tour] Target element found, starting tour');
      }
      
      navigationRetries.current = 0;
    }
    
    // Start the tour
    console.log('[Tour] Setting run=true to start joyride');
    setRun(true);
  }, [navigate, location.pathname, tourSteps]);

  // Handle tour completion
  const handleComplete = useCallback(() => {
    console.log('[Tour] Tour completed');
    setRun(false);
    setStepIndex(0);
    localStorage.setItem(TOUR_CONFIG.COMPLETED_KEY, 'true');
    sessionStorage.removeItem(TOUR_CONFIG.STORAGE_KEY);
    onComplete?.();
  }, [onComplete]);

  // Handle next step
  const handleNextStep = useCallback(async (index: number) => {
    console.log('[Tour] ========== handleNextStep START ==========');
    console.log('[Tour] handleNextStep called with index:', index, 'total steps:', tourSteps.length);
    console.log('[Tour] Current tourSteps:', tourSteps.map(s => ({ id: s.id, route: s.route, target: s.target })));
    
    if (index >= tourSteps.length) {
      // Tour completed
      console.log('[Tour] Reached end of tour - index', index, 'is >= tourSteps.length', tourSteps.length);
      handleComplete();
      return;
    }
    
    const nextStep = tourSteps[index];
    if (!nextStep) {
      console.error('[Tour] CRITICAL: Next step not found at index:', index);
      console.error('[Tour] tourSteps array:', tourSteps);
      console.error('[Tour] Attempting to access index', index, 'but array length is', tourSteps.length);
      return;
    }
    
    setStepIndex(index);
    sessionStorage.setItem(TOUR_CONFIG.STORAGE_KEY, String(index));
    
    console.log('[Tour] Processing step:', {
      id: nextStep.id,
      route: nextStep.route,
      target: nextStep.target,
      requireAuth: nextStep.requireAuth,
      desktopOnly: nextStep.desktopOnly,
      mobileOnly: nextStep.mobileOnly
    });
    
    // Pause joyride while navigating
    console.log('[Tour] Pausing joyride (setRun(false))');
    setRun(false);
    
    // Small delay to ensure joyride pauses properly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[Tour] Current location.pathname:', location.pathname);
    console.log('[Tour] Next step route:', nextStep.route);
    console.log('[Tour] Need navigation:', nextStep.route !== location.pathname);
    
    // Navigate to next route if needed
    if (nextStep.route !== location.pathname) {
      console.log('[Tour] Navigating to next step route:', nextStep.route);
      isNavigating.current = true;
      navigate(nextStep.route);
      
      const navSuccess = await waitForNavigation(nextStep.route);
      isNavigating.current = false;
      
      if (!navSuccess) {
        console.warn('[Tour] Navigation failed to:', nextStep.route);
        // Try to continue anyway
      }
      
      // Additional delay after navigation to let page render
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for target element
    if (nextStep.target !== 'body') {
      console.log('[Tour] Waiting for target element:', nextStep.target);
      const element = await waitForSelector(nextStep.target, TOUR_CONFIG.WAIT_TIMEOUT_MS);
      
      if (!element) {
        console.warn('[Tour] Target not found:', nextStep.target, 'skipping to next step');
        // Skip to next step
        if (index < tourSteps.length - 1) {
          setTimeout(() => handleNextStep(index + 1), 500);
          return;
        } else {
          console.log('[Tour] Was last step, completing tour');
          handleComplete();
          return;
        }
      } else {
        console.log('[Tour] Target element found:', nextStep.target);
      }
    }
    
    // Resume tour
    console.log('[Tour] Resuming tour at step:', index);
    setRun(true);
  }, [navigate, location.pathname, tourSteps, handleComplete]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;
    
    console.log('[Tour] Joyride callback:', { status, type, index, action });
    console.log('[Tour] Current tourSteps.length:', tourSteps.length);
    console.log('[Tour] Current stepIndex state:', stepIndex);
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('[Tour] Tour finished or skipped');
      handleComplete();
    } else if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        console.log('[Tour] User clicked NEXT, moving to index:', nextIndex);
        
        if (nextIndex >= tourSteps.length) {
          console.log('[Tour] Next index exceeds tourSteps length, completing tour');
          handleComplete();
          return;
        }
        
        // Move to next step
        handleNextStep(nextIndex);
      } else if (action === ACTIONS.PREV && index > 0) {
        console.log('[Tour] User clicked PREV, moving to index:', index - 1);
        // Move to previous step
        handleNextStep(index - 1);
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn('[Tour] TARGET_NOT_FOUND event for step:', index);
      console.warn('[Tour] Step that failed:', tourSteps[index]);
      // Skip to next step
      if (index < tourSteps.length - 1) {
        console.log('[Tour] Skipping to next step due to target not found');
        setTimeout(() => handleNextStep(index + 1), 500);
      } else {
        console.log('[Tour] Was last step, completing tour');
        handleComplete();
      }
    }
  }, [handleComplete, handleNextStep, tourSteps.length, tourSteps, stepIndex]);

  // Expose global API
  useEffect(() => {
    (window as any).startAppTour = (startIndex?: number) => {
      startTour(startIndex || 0);
    };
    
    return () => {
      delete (window as any).startAppTour;
    };
  }, [startTour]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      spotlightClicks
      disableOverlayClose={false}
      callback={handleJoyrideCallback}
      styles={JOYRIDE_STYLES}
      locale={JOYRIDE_LOCALE}
      floaterProps={{
        disableAnimation: false,
      }}
      scrollToFirstStep
      scrollOffset={100}
    />
  );
};

export default TourManager;
