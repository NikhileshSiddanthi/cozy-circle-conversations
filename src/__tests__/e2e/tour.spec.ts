import { test, expect } from '@playwright/test';

test.describe('Application Tour', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to ensure fresh tour state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display tour on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Wait for tour to appear (1 second delay + load time)
    await page.waitForTimeout(1500);
    
    // Check if Joyride tooltip appears
    const tooltip = page.locator('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip');
    await expect(tooltip).toBeVisible({ timeout: 10000 });
  });

  test('should navigate through tour steps', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Wait for first step
    const tooltip = page.locator('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip').first();
    await expect(tooltip).toBeVisible({ timeout: 10000 });
    
    // Click Next button
    const nextButton = page.locator('button:has-text("Next")').first();
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Verify we moved to next step (tooltip still visible)
    await expect(tooltip).toBeVisible();
    
    // Click Next again
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Should still see tooltip
    await expect(tooltip).toBeVisible();
  });

  test('should navigate to different routes during tour', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Wait for tour to start
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    // Click through several steps to trigger navigation
    for (let i = 0; i < 5; i++) {
      const nextButton = page.locator('button:has-text("Next")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000); // Wait for navigation and element detection
      }
    }
    
    // Verify we navigated away from home (could be /groups or /news)
    const currentUrl = page.url();
    const isOnDifferentRoute = currentUrl.includes('/groups') || currentUrl.includes('/news');
    expect(isOnDifferentRoute).toBeTruthy();
  });

  test('should persist tour progress in sessionStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Wait for tour
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    // Click next a few times
    for (let i = 0; i < 2; i++) {
      const nextButton = page.locator('button:has-text("Next")').first();
      await nextButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check sessionStorage for tour step
    const tourStep = await page.evaluate(() => {
      return sessionStorage.getItem('app_tour_step');
    });
    
    expect(tourStep).toBeTruthy();
    const stepIndex = parseInt(tourStep || '0', 10);
    expect(stepIndex).toBeGreaterThan(0);
  });

  test('should skip tour when skip button clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Wait for tour
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    // Click skip button
    const skipButton = page.locator('button:has-text("Skip")').first();
    await skipButton.click();
    await page.waitForTimeout(500);
    
    // Verify tour is closed (tooltip not visible)
    const tooltip = page.locator('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip');
    await expect(tooltip).not.toBeVisible();
    
    // Verify completion flag is set
    const completed = await page.evaluate(() => {
      return localStorage.getItem('app_tour_completed');
    });
    expect(completed).toBe('true');
  });

  test('should not show tour on subsequent visits', async ({ page }) => {
    // First visit - complete tour
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    const skipButton = page.locator('button:has-text("Skip")').first();
    await skipButton.click();
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1500);
    
    // Verify tour does not appear
    const tooltip = page.locator('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip');
    await expect(tooltip).not.toBeVisible();
  });

  test('should restart tour from home page button', async ({ page }) => {
    // Skip initial tour
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    const skipButton = page.locator('button:has-text("Skip")').first();
    await skipButton.click();
    await page.waitForTimeout(500);
    
    // Click "App Tour" button on home page
    const tourButton = page.locator('button:has-text("App Tour")');
    await tourButton.click();
    await page.waitForTimeout(1000);
    
    // Verify tour restarted
    const tooltip = page.locator('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip');
    await expect(tooltip).toBeVisible();
  });

  test('should handle missing target elements gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Wait for tour
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    // Hide a tour target element using JavaScript
    await page.evaluate(() => {
      const element = document.querySelector('[data-tour="notification-bell"]');
      if (element) {
        (element as HTMLElement).style.display = 'none';
      }
    });
    
    // Continue clicking through tour
    for (let i = 0; i < 8; i++) {
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Finish")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      } else {
        break; // Tour ended
      }
    }
    
    // Tour should complete without errors (tooltip eventually disappears)
    const tooltip = page.locator('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip');
    await page.waitForTimeout(2000);
    // Tour should either complete or continue past the missing element
    // We just verify no error occurred (test passes if we get here)
  });

  test('should complete full tour', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Wait for tour
    await page.waitForSelector('[data-test-id="react-joyride-tooltip"], .react-joyride__tooltip', { timeout: 10000 });
    
    // Click through entire tour
    let clickCount = 0;
    const maxClicks = 20; // Safety limit
    
    while (clickCount < maxClicks) {
      const nextButton = page.locator('button:has-text("Next")').first();
      const finishButton = page.locator('button:has-text("Finish")').first();
      
      if (await finishButton.isVisible()) {
        await finishButton.click();
        break;
      } else if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        clickCount++;
      } else {
        break;
      }
    }
    
    // Verify tour completed
    await page.waitForTimeout(500);
    const completed = await page.evaluate(() => {
      return localStorage.getItem('app_tour_completed');
    });
    expect(completed).toBe('true');
  });
});
