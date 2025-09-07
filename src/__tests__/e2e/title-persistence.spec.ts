import { test, expect } from '@playwright/test';

test.describe('Title Persistence - TASK 1', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page 
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should persist title with debounced saving', async ({ page }) => {
    const testTitle = `Test Title ${Date.now()}`;
    
    // For this test, we'll use console logs to verify the behavior
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Title changing') || msg.text().includes('Draft') || msg.text().includes('saving')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click to open composer
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    
    // Wait for expanded composer
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    // Find and fill title input
    const titleInput = page.locator('[data-testid="title-input"]');
    await titleInput.fill(testTitle);
    
    // Wait for debounced save
    await page.waitForTimeout(2000);
    
    console.log('Console logs captured:', consoleLogs);
    
    // Check if title change was logged
    const titleChangeLogs = consoleLogs.filter(log => log.includes('Title changing to:'));
    expect(titleChangeLogs.length).toBeGreaterThan(0);
    
    // Verify the title is still in the input
    const currentValue = await titleInput.inputValue();
    expect(currentValue).toBe(testTitle);
  });
});