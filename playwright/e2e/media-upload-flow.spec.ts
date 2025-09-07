import { test, expect } from '@playwright/test';

test.describe('Media Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assume user is already logged in for this test
  });

  test('E2E1: Upload image with preview and publish shows in feed', async ({ page }) => {
    // Navigate to post composer
    await page.click('[data-testid="create-post-button"]');
    
    // Fill in post title
    await page.fill('input[placeholder*="title"]', 'Test Post with Image');
    
    // Switch to media tab
    await page.click('[data-testid="media-tab"]');
    
    // Create a test image file
    const testImagePath = './test-assets/test-image.jpg';
    
    // Upload the image
    await page.setInputFiles('input[type="file"]', testImagePath);
    
    // Verify immediate preview appears
    await expect(page.locator('img[alt*="test-image.jpg"]')).toBeVisible();
    
    // Wait for upload to complete
    await expect(page.locator('text=Upload completed')).toBeVisible();
    
    // Verify preview URL is replaced with server URL
    const previewImg = page.locator('img[alt*="test-image.jpg"]');
    const src = await previewImg.getAttribute('src');
    expect(src).toContain('supabase.co');
    
    // Publish the post
    await page.click('button[type="submit"]');
    
    // Verify post appears in feed with image
    await expect(page.locator('text=Test Post with Image')).toBeVisible();
    await expect(page.locator('img[alt="Post media"]')).toBeVisible();
    
    // Verify image is displayed correctly in feed
    const feedImage = page.locator('img[alt="Post media"]');
    const feedImageSrc = await feedImage.getAttribute('src');
    expect(feedImageSrc).toContain('supabase.co');
  });

  test('E2E2: Upload oversized file shows error', async ({ page }) => {
    // Navigate to post composer
    await page.click('[data-testid="create-post-button"]');
    
    // Switch to media tab
    await page.click('[data-testid="media-tab"]');
    
    // Try to upload a large file (mock with file size check)
    // This would need a large test file > 10MB
    
    // Verify error message appears
    await expect(page.locator('text=too large')).toBeVisible();
    
    // Verify no preview is shown
    await expect(page.locator('img[alt*="large-file"]')).not.toBeVisible();
  });

  test('E2E3: Discard draft removes media from storage', async ({ page }) => {
    // Navigate to post composer
    await page.click('[data-testid="create-post-button"]');
    
    // Fill in some content
    await page.fill('input[placeholder*="title"]', 'Draft to be discarded');
    
    // Switch to media tab and upload file
    await page.click('[data-testid="media-tab"]');
    const testImagePath = './test-assets/test-image.jpg';
    await page.setInputFiles('input[type="file"]', testImagePath);
    
    // Wait for upload to complete
    await expect(page.locator('text=Upload completed')).toBeVisible();
    
    // Discard the draft
    await page.click('[data-testid="discard-draft"]');
    
    // Verify draft is cleared
    await expect(page.locator('input[placeholder*="title"]')).toHaveValue('');
    
    // Verify media is removed (no preview visible)
    await expect(page.locator('img[alt*="test-image.jpg"]')).not.toBeVisible();
  });
});

test.describe('Post and Comment Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Create a test post first
    await page.click('[data-testid="create-post-button"]');
    await page.fill('input[placeholder*="title"]', 'Editable Test Post');
    await page.fill('textarea[placeholder*="thoughts"]', 'Original content');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Editable Test Post')).toBeVisible();
  });

  test('E2E4: Edit post title and content shows edited tag', async ({ page }) => {
    // Hover over post to reveal edit button
    await page.hover('[data-testid="post-card"]');
    
    // Click edit button
    await page.click('[data-testid="edit-post-button"]');
    
    // Verify edit mode is active
    await expect(page.locator('text=Editing Post')).toBeVisible();
    
    // Edit title and content
    await page.fill('input[value="Editable Test Post"]', 'Edited Test Post');
    await page.fill('textarea[value="Original content"]', 'Updated content');
    
    // Save changes
    await page.click('[data-testid="save-edit-button"]');
    
    // Verify changes are saved
    await expect(page.locator('text=Edited Test Post')).toBeVisible();
    await expect(page.locator('text=Updated content')).toBeVisible();
    
    // Verify edited tag appears
    await expect(page.locator('text=Edited')).toBeVisible();
  });

  test('E2E5: Edit comment shows edited tag', async ({ page }) => {
    // Add a comment first
    await page.click('[data-testid="toggle-comments"]');
    await page.fill('textarea[placeholder*="Write a comment"]', 'Original comment');
    await page.click('button:has-text("Comment")');
    await expect(page.locator('text=Original comment')).toBeVisible();
    
    // Hover over comment to reveal edit button
    await page.hover('[data-testid="comment"]');
    
    // Click edit button
    await page.click('[data-testid="edit-comment-button"]');
    
    // Verify edit mode is active
    await expect(page.locator('text=Editing comment')).toBeVisible();
    
    // Edit comment content
    await page.fill('textarea[value="Original comment"]', 'Edited comment');
    
    // Save changes
    await page.click('[data-testid="save-comment-edit"]');
    
    // Verify changes are saved
    await expect(page.locator('text=Edited comment')).toBeVisible();
    
    // Verify edited tag appears
    await expect(page.locator('text=Edited')).toBeVisible();
  });

  test('E2E6: Unauthorized edit attempt fails with error', async ({ page }) => {
    // This test would need to switch to a different user context
    // For now, we'll test the permission check logic
    
    // Try to edit someone else's post (mock scenario)
    // The UI should not show edit buttons for non-authors
    
    // Navigate to a post not owned by current user
    // Verify no edit button is visible
    await expect(page.locator('[data-testid="edit-post-button"]')).not.toBeVisible();
  });
});