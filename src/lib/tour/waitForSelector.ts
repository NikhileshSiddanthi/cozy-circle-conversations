import { TOUR_CONFIG } from './config';

/**
 * Wait for a DOM element to appear using polling
 * @param selector - CSS selector or data-tour attribute selector
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves with the element or null if timeout
 */
export async function waitForSelector(
  selector: string,
  timeout = TOUR_CONFIG.WAIT_TIMEOUT_MS
): Promise<HTMLElement | null> {
  const start = Date.now();
  
  return new Promise((resolve) => {
    const check = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      
      if (el) {
        // Element found - scroll it into view
        try {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
          });
        } catch (error) {
          console.warn('Failed to scroll element into view:', error);
        }
        return resolve(el);
      }
      
      // Check if timeout exceeded
      if (Date.now() - start > timeout) {
        console.warn(`[Tour] Timeout waiting for selector: ${selector}`);
        return resolve(null);
      }
      
      // Continue polling
      setTimeout(check, TOUR_CONFIG.POLL_INTERVAL_MS);
    };
    
    check();
  });
}

/**
 * Wait for navigation to complete
 * @param expectedPath - The path we expect to navigate to
 * @param timeout - Maximum time to wait
 */
export async function waitForNavigation(
  expectedPath: string,
  timeout = TOUR_CONFIG.WAIT_TIMEOUT_MS
): Promise<boolean> {
  const start = Date.now();
  
  return new Promise((resolve) => {
    const check = () => {
      const currentPath = window.location.pathname;
      
      if (currentPath === expectedPath) {
        return resolve(true);
      }
      
      if (Date.now() - start > timeout) {
        console.warn(`[Tour] Timeout waiting for navigation to: ${expectedPath}`);
        return resolve(false);
      }
      
      setTimeout(check, TOUR_CONFIG.POLL_INTERVAL_MS);
    };
    
    check();
  });
}
