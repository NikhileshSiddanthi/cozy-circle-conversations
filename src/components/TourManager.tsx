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
  
  // Don't show tour on auth page
  if (location.pathname === '/auth') {
    return null;
  }
  
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

  // Track route changes (but don't pause tour during programmatic navigation)
  useEffect(() => {
    currentRoute.current = location.pathname;
  }, [location.pathname]);

  // Handle tour completion
  const handleComplete = useCallback(() => {
    console.log('[Tour] Tour completed');
    setRun(false);
    setStepIndex(0);
    localStorage.setItem(TOUR_CONFIG.COMPLETED_KEY, 'true');
    sessionStorage.removeItem(TOUR_CONFIG.STORAGE_KEY);
    onComplete?.();
  }, [onComplete]);

  // Pre-navigate and prepare next step BEFORE advancing Joyride
  const prepareNextStep = useCallback(async (index: number) => {
    console.log('[Tour] ===== PREPARING STEP', index, '=====');
    
    if (index >= tourSteps.length) {
      console.log('[Tour] No more steps, completing');
      handleComplete();
      return false;
    }
    
    const nextStep = tourSteps[index];
    if (!nextStep) {
      console.error('[Tour] Step not found at index', index);
      return false;
    }
    
    console.log('[Tour] Preparing step:', nextStep.id, 'route:', nextStep.route);
    
    // Navigate if needed
    if (nextStep.route !== location.pathname) {
      console.log('[Tour] Need to navigate from', location.pathname, 'to', nextStep.route);
      isNavigating.current = true;
      navigate(nextStep.route);
      
      // Wait for navigation
      await waitForNavigation(nextStep.route);
      await new Promise(resolve => setTimeout(resolve, 500)); // Extra delay for render
      isNavigating.current = false;
      
      console.log('[Tour] Navigation complete');
    }
    
    // Wait for element if not body
    if (nextStep.target !== 'body') {
      console.log('[Tour] Waiting for element:', nextStep.target);
      const element = await waitForSelector(nextStep.target, TOUR_CONFIG.WAIT_TIMEOUT_MS);
      
      if (!element) {
        console.warn('[Tour] Element not found:', nextStep.target);
        // Try next step
        return prepareNextStep(index + 1);
      }
      
      console.log('[Tour] Element found and ready');
    }
    
    // Update state to show this step
    setStepIndex(index);
    sessionStorage.setItem(TOUR_CONFIG.STORAGE_KEY, String(index));
    
    return true;
  }, [navigate, location.pathname, tourSteps, handleComplete]);

  // Start tour function
  const startTour = useCallback(async (startIndex = 0) => {
    console.log('[Tour] ===== STARTING TOUR =====');
    console.log('[Tour] Start index:', startIndex, 'Total steps:', tourSteps.length);
    
    if (tourSteps.length === 0) {
      console.warn('[Tour] No tour steps available');
      return;
    }
    
    // Prepare the first step
    const success = await prepareNextStep(startIndex);
    
    if (success) {
      console.log('[Tour] First step ready, starting Joyride');
      setRun(true);
    } else {
      console.error('[Tour] Failed to prepare first step');
    }
  }, [tourSteps.length, prepareNextStep]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = useCallback(async (data: CallBackProps) => {
    const { status, type, index, action } = data;
    
    console.log('[Tour] Joyride callback:', { status, type, index, action });
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('[Tour] Tour finished or skipped');
      handleComplete();
      return;
    }
    
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      const nextIndex = index + 1;
      console.log('[Tour] Moving to next step:', nextIndex);
      
      // Stop current tour
      setRun(false);
      
      // Prepare and navigate to next step
      const success = await prepareNextStep(nextIndex);
      
      if (success) {
        // Small delay then restart tour
        setTimeout(() => {
          console.log('[Tour] Restarting tour at step', nextIndex);
          setRun(true);
        }, 300);
      }
    } else if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV && index > 0) {
      const prevIndex = index - 1;
      console.log('[Tour] Moving to previous step:', prevIndex);
      
      setRun(false);
      const success = await prepareNextStep(prevIndex);
      
      if (success) {
        setTimeout(() => setRun(true), 300);
      }
    }
  }, [handleComplete, prepareNextStep]);

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
