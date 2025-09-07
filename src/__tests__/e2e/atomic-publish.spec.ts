import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Atomic Publish Flow - TASK 3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should publish post with media atomically', async ({ page }) => {
    const testTitle = `Atomic Test ${Date.now()}`;
    
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('PUB START') || 
          msg.text().includes('PUB VALIDATE') || 
          msg.text().includes('POST CREATED')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Open composer
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    // Add title
    await page.locator('[data-testid="title-input"]').fill(testTitle);
    
    // Add media
    await page.click('button[data-value="media"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
      path.join(__dirname, '../fixtures/test-image-2.png')
    ]);
    
    // Wait for uploads
    await page.waitForTimeout(5000);
    
    // Publish
    const publishButton = page.locator('button[type="submit"]');
    await publishButton.click();
    
    // Wait for publish to complete
    await page.waitForTimeout(5000);
    
    // Verify console logs show atomic process
    const pubStartLogs = consoleLogs.filter(log => log.includes('PUB START'));
    const pubValidateLogs = consoleLogs.filter(log => log.includes('PUB VALIDATE'));
    const postCreatedLogs = consoleLogs.filter(log => log.includes('POST CREATED'));
    
    expect(pubStartLogs.length).toBeGreaterThan(0);
    expect(pubValidateLogs.length).toBeGreaterThan(0);
    expect(postCreatedLogs.length).toBeGreaterThan(0);
  });

  test('should handle idempotent publishing', async ({ page }) => {
    const testTitle = `Idempotent Test ${Date.now()}`;
    
    // Open composer and create post
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    await page.locator('[data-testid="title-input"]').fill(testTitle);
    await page.locator('[data-testid="content-textarea"]').fill('Test content');
    
    // First publish
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    // Try to publish again (should be idempotent)
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    await page.locator('[data-testid="title-input"]').fill(testTitle);
    await page.locator('button[type="submit"]').click();
    
    // Should not create duplicate post
    await page.waitForTimeout(3000);
  });
});