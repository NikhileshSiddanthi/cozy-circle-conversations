import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Multi-Image Handling - TASK 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should support multiple image uploads', async ({ page }) => {
    // Open composer
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    // Switch to media tab
    await page.click('button[data-value="media"]');
    
    // Upload multiple test images
    const fileInput = page.locator('input[type="file"]');
    
    // Upload first image
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-image-1.jpg'));
    
    // Wait for first upload to start
    await page.waitForTimeout(1000);
    
    // Upload second image
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-image-2.png'));
    
    // Wait for uploads to complete
    await page.waitForTimeout(5000);
    
    // Verify multiple file previews are shown
    const filePreviews = page.locator('[alt*="test-image"]');
    await expect(filePreviews).toHaveCount(2);
  });

  test('should allow removing uploaded images', async ({ page }) => {
    // Open composer and upload an image
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    await page.click('button[data-value="media"]');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-image-1.jpg'));
    
    // Wait for upload
    await page.waitForTimeout(3000);
    
    // Find and click remove button
    const removeButton = page.locator('button').filter({ hasText: /×/ }).first();
    await removeButton.click();
    
    // Wait for removal
    await page.waitForTimeout(1000);
    
    // Verify image is removed
    const filePreviews = page.locator('[alt*="test-image"]');
    await expect(filePreviews).toHaveCount(0);
  });

  test('should restore images after page reload', async ({ page }) => {
    // Open composer and upload an image
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    await page.click('button[data-value="media"]');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-image-1.jpg'));
    
    // Wait for upload to complete
    await page.waitForTimeout(5000);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Open composer again
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="post-composer-expanded"]', { timeout: 10000 });
    
    await page.click('button[data-value="media"]');
    
    // Images should be restored
    const filePreviews = page.locator('img[src*="supabase"]');
    await expect(filePreviews).toHaveCount(1);
  });
});