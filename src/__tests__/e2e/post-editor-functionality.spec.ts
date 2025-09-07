import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test.describe('Post Editor Functionality', () => {
  test('should require title when creating post', async ({ page }) => {
    await page.click('[data-testid="create-post-button"]');
    
    // Wait for expanded form
    await page.waitForSelector('[data-testid="post-composer-expanded"]');
    
    // Try to submit without title
    await page.fill('[data-testid="content-textarea"]', 'This is some content');
    await page.click('button[type="submit"]');
    
    // Should show error toast
    await expect(page.locator('text=Title Required')).toBeVisible();
  });

  test('should not show group selector when already in group', async ({ page }) => {
    // Simulate being in a group by going to specific group page
    await page.goto('/group/test-group-id');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-composer-expanded"]');
    
    // Should show "posting to [group name]" instead of selector
    await expect(page.locator('text=posting to')).toBeVisible();
    await expect(page.locator('select')).not.toBeVisible();
  });

  test('should upload multiple images successfully', async ({ page }) => {
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-composer-expanded"]');
    
    // Fill required title
    await page.fill('[data-testid="title-input"]', 'Test Multi-Image Post');
    
    // Switch to media tab
    await page.click('text=Media');
    
    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'src/__tests__/fixtures/test-image-1.jpg',
      'src/__tests__/fixtures/test-image-2.png'
    ]);
    
    // Wait for uploads to complete
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });
    
    // Should show 2 files
    await expect(page.locator('text=Media Files (2/')).toBeVisible();
    
    // Submit post
    await page.click('button:has-text("Publish")');
    
    // Should show success message
    await expect(page.locator('text=Post Published')).toBeVisible();
  });

  test('should show URL preview when adding link', async ({ page }) => {
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-composer-expanded"]');
    
    // Fill required title
    await page.fill('[data-testid="title-input"]', 'Test Link Post');
    
    // Switch to link tab
    await page.click('text=Link');
    
    // Add URL
    await page.fill('input[placeholder="Paste a URL to show preview"]', 'https://example.com');
    
    // Should show preview
    await expect(page.locator('text=URL Preview')).toBeVisible();
  });

  test('should edit existing post with media', async ({ page }) => {
    // Create a post first
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-composer-expanded"]');
    await page.fill('[data-testid="title-input"]', 'Original Title');
    await page.fill('[data-testid="content-textarea"]', 'Original content');
    await page.click('button:has-text("Publish")');
    await page.waitForSelector('text=Post Published');
    
    // Wait for post to appear and click edit
    await page.hover('.group');
    await page.click('[data-testid="edit-post"]');
    
    // Should open edit modal
    await expect(page.locator('text=Edit Post')).toBeVisible();
    
    // Edit title and content
    await page.fill('input[value="Original Title"]', 'Updated Title');
    await page.fill('textarea', 'Updated content');
    
    // Add media
    await page.click('text=Media');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(['src/__tests__/fixtures/test-image-1.jpg']);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });
    
    // Save changes
    await page.click('button:has-text("Update")');
    
    // Should show success message
    await expect(page.locator('text=Post Updated')).toBeVisible();
    
    // Verify changes
    await expect(page.locator('text=Updated Title')).toBeVisible();
    await expect(page.locator('text=Updated content')).toBeVisible();
    await expect(page.locator('text=Edited')).toBeVisible();
  });
});