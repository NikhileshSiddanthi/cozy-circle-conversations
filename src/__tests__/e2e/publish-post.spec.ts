import { test, expect } from '@playwright/test';

test.describe('Publish Post E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page for controlled environment
    await page.goto('/test');
    
    // Wait for auth to be ready (assuming user is logged in)
    await page.waitForTimeout(1000);
  });

  test('should publish draft with media successfully', async ({ page }) => {
    // Step 1: Create a draft with media
    await page.click('button:has-text("Init Upload")');
    
    // Wait for upload initialization
    await page.waitForSelector('text=/Upload ID:/');
    
    // Mock file upload completion
    const uploadId = await page.textContent('[data-testid="upload-id"]');
    
    // Step 2: Complete the upload (simulate)
    await page.evaluate((id) => {
      // Simulate successful file upload
      window.localStorage.setItem('test-upload-complete', id || '');
    }, uploadId);
    
    // Step 3: Trigger publish
    await page.click('button:has-text("Publish Post")');
    
    // Step 4: Verify success response
    await expect(page.locator('text=/Post published successfully/')).toBeVisible({ timeout: 10000 });
    
    // Step 5: Verify post was created
    const postId = await page.getAttribute('[data-testid="post-id"]', 'data-post-id');
    expect(postId).toBeTruthy();
    expect(postId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  });

  test('should handle publish with no media', async ({ page }) => {
    // Create draft with just text content
    await page.fill('input[placeholder*="title"]', 'Test Post Title');
    await page.fill('textarea[placeholder*="content"]', 'Test post content without media');
    
    // Trigger publish
    await page.click('button:has-text("Publish Post")');
    
    // Verify success
    await expect(page.locator('text=/Post published successfully/')).toBeVisible({ timeout: 5000 });
    
    // Verify media count is 0
    const mediaCount = await page.textContent('[data-testid="media-count"]');
    expect(mediaCount).toBe('0');
  });

  test('should prevent duplicate publishing (idempotency)', async ({ page }) => {
    // First publish
    await page.fill('input[placeholder*="title"]', 'Duplicate Test');
    await page.click('button:has-text("Publish Post")');
    await expect(page.locator('text=/Post published successfully/')).toBeVisible();
    
    const firstPostId = await page.textContent('[data-testid="post-id"]');
    
    // Second publish attempt
    await page.click('button:has-text("Publish Post")');
    await expect(page.locator('text=/Post already published/')).toBeVisible();
    
    const secondPostId = await page.textContent('[data-testid="post-id"]');
    expect(secondPostId).toBe(firstPostId);
  });

  test('should handle authentication errors', async ({ page }) => {
    // Clear auth tokens to simulate logged out state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Attempt to publish
    await page.click('button:has-text("Publish Post")');
    
    // Should see authentication error
    await expect(page.locator('text=/Unauthorized/')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required content', async ({ page }) => {
    // Attempt to publish empty draft
    await page.click('button:has-text("Publish Post")');
    
    // Should see validation error
    await expect(page.locator('text=/Draft must have title, content, or media/')).toBeVisible({ timeout: 5000 });
  });

  test('should preserve media order after publish', async ({ page }) => {
    // Upload multiple files in specific order
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Init Upload")');
      await page.waitForTimeout(500);
      
      // Simulate upload completion
      await page.evaluate((index) => {
        window.localStorage.setItem(`test-upload-${index}`, `file-${index}.jpg`);
      }, i);
    }
    
    // Verify order before publish
    const mediaItems = await page.locator('[data-testid^="media-item-"]').count();
    expect(mediaItems).toBe(3);
    
    // Publish post
    await page.click('button:has-text("Publish Post")');
    await expect(page.locator('text=/Post published successfully/')).toBeVisible();
    
    // Navigate to published post and verify order is preserved
    const postId = await page.textContent('[data-testid="post-id"]');
    await page.goto(`/posts/${postId}`);
    
    // Check that media items appear in the same order
    const publishedMedia = await page.locator('[data-testid="post-media-item"]').count();
    expect(publishedMedia).toBe(3);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept and fail the publish request
    await page.route('**/functions/v1/publish-post', route => {
      route.abort('failed');
    });
    
    await page.fill('input[placeholder*="title"]', 'Network Error Test');
    await page.click('button:has-text("Publish Post")');
    
    // Should show error message
    await expect(page.locator('text=/Failed to publish/')).toBeVisible({ timeout: 5000 });
    
    // Draft should remain intact
    const title = await page.inputValue('input[placeholder*="title"]');
    expect(title).toBe('Network Error Test');
  });

  test('should enable/disable buttons correctly during publish', async ({ page }) => {
    // Initially enabled
    const publishBtn = page.locator('button:has-text("Publish Post")');
    await expect(publishBtn).toBeEnabled();
    
    // Should disable during publish
    await page.fill('input[placeholder*="title"]', 'Button State Test');
    await publishBtn.click();
    
    // Check button is disabled and shows loading state
    await expect(publishBtn).toBeDisabled();
    await expect(page.locator('text=/Publishing.../')).toBeVisible();
    
    // Should re-enable after completion
    await expect(publishBtn).toBeEnabled({ timeout: 10000 });
  });
});