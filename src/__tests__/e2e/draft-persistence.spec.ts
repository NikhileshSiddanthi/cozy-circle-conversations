import { test, expect } from '@playwright/test';

test.describe('Draft Persistence - TASK 1', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page first
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Then navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should persist title with debounced saving', async ({ page }) => {
    const testTitle = `Test Title ${Date.now()}`;
    
    // Capture console logs for verification
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Title changing') || 
          msg.text().includes('Draft') || 
          msg.text().includes('saving') ||
          msg.text().includes('PUB')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Click to open composer
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    
    // Wait for expanded composer
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    // Find and fill title input
    const titleInput = page.locator('[data-testid="title-input"]');
    await titleInput.fill(testTitle);
    
    // Wait for debounced save (1 second + buffer)
    await page.waitForTimeout(2000);
    
    // Verify title change was logged
    const titleChangeLogs = consoleLogs.filter(log => log.includes('Title changing to:'));
    expect(titleChangeLogs.length).toBeGreaterThan(0);
    
    // Verify the title is still in the input
    const currentValue = await titleInput.inputValue();
    expect(currentValue).toBe(testTitle);

    // Reload the page to test persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Open composer again
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    // Check if title persisted
    const titleInputAfterReload = page.locator('[data-testid="title-input"]');
    const persistedValue = await titleInputAfterReload.inputValue();
    expect(persistedValue).toBe(testTitle);
  });

  test('should allow publishing text-only posts', async ({ page }) => {
    const testTitle = `Text Only Post ${Date.now()}`;
    const testContent = `This is a text-only post content ${Date.now()}`;
    
    // Open composer
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    // Fill title and content
    await page.locator('[data-testid="title-input"]').fill(testTitle);
    await page.locator('[data-testid="content-textarea"]').fill(testContent);
    
    // Wait for debounced save
    await page.waitForTimeout(2000);
    
    // Try to publish
    const publishButton = page.locator('button[type="submit"]');
    await publishButton.click();
    
    // Wait for success message or navigation
    await page.waitForTimeout(3000);
    
    // Should not show error about missing content
    const errorToast = page.locator('[role="alert"]').filter({ hasText: 'Content Required' });
    await expect(errorToast).toHaveCount(0);
  });
});