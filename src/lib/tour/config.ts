/**
 * Tour Configuration
 * Centralized configuration for the application tour system
 */

export const TOUR_CONFIG = {
  // Timeout to wait for a target element to appear (milliseconds)
  WAIT_TIMEOUT_MS: 8000,
  
  // Interval between DOM polling checks (milliseconds)
  POLL_INTERVAL_MS: 150,
  
  // Maximum navigation retry attempts
  MAX_NAV_RETRIES: 2,
  
  // Mobile breakpoint (pixels)
  MOBILE_BREAKPOINT: 768,
  
  // SessionStorage key for persisting tour progress
  STORAGE_KEY: 'app_tour_step',
  
  // LocalStorage key for tracking tour completion
  COMPLETED_KEY: 'app_tour_completed',
} as const;

/**
 * Joyride styling configuration
 */
export const JOYRIDE_STYLES = {
  options: {
    zIndex: 10000,
    primaryColor: 'hsl(var(--primary))',
    textColor: 'hsl(var(--foreground))',
    backgroundColor: 'hsl(var(--background))',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    arrowColor: 'hsl(var(--background))',
    spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
    beaconSize: 36,
  },
  tooltip: {
    borderRadius: 8,
    padding: 20,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  tooltipContent: {
    fontSize: '0.9375rem',
    lineHeight: 1.5,
  },
  buttonNext: {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
    borderRadius: 6,
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
  },
  buttonBack: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
    marginRight: '0.5rem',
  },
  buttonSkip: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  },
};

/**
 * Localized button text
 */
export const JOYRIDE_LOCALE = {
  back: 'Previous',
  close: 'Close',
  last: 'Finish Tour',
  next: 'Next',
  skip: 'Skip Tour',
};

/**
 * Filter tour steps based on viewport width and authentication status
 */
export function getStepsForViewport(
  allSteps: any[],
  viewportWidth: number,
  isAuthenticated: boolean
): any[] {
  const isMobile = viewportWidth < TOUR_CONFIG.MOBILE_BREAKPOINT;
  
  return allSteps.filter(step => {
    // Filter by mobile/desktop
    if (isMobile && step.desktopOnly) return false;
    if (!isMobile && step.mobileOnly) return false;
    
    // Filter by authentication
    if (step.requireAuth && !isAuthenticated) return false;
    
    return true;
  });
}
