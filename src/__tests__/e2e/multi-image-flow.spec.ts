import { test, expect } from '@playwright/test';

test.describe('Multi-Image Upload E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Go to test page and ensure user is signed in
    await page.goto('/test');
    
    // Wait for auth to load
    await page.waitForTimeout(2000);
    
    // Check if we need to sign in
    const signInButton = page.locator('text=Sign In');
    if (await signInButton.isVisible()) {
      // Handle sign in if needed - this would depend on your auth setup
      // For now, assume user is already authenticated
    }
  });

  test('should upload multiple images and create post', async ({ page }) => {
    // Expand the post composer
    await page.click('[data-testid="create-post-button"]');
    
    // Wait for draft creation
    await page.waitForTimeout(1000);
    
    // Add title
    const titleInput = page.locator('[data-testid="title-input"]');
    await titleInput.fill('Multi-Image Test Post');
    
    // Click on Media tab
    await page.click('text=Media');
    
    // Wait for upload area to appear
    await expect(page.locator('text=Upload your media files')).toBeVisible();
    
    // Create test image files using JavaScript
    await page.evaluate(() => {
      // Create a test image blob
      const createTestFile = (name: string, type: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 100, 100);
        
        return new Promise<File>((resolve) => {
          canvas.toBlob((blob) => {
            const file = new File([blob!], name, { type });
            resolve(file);
          }, type);
        });
      };

      // Store files on window for later use
      Promise.all([
        createTestFile('test-image-1.jpg', 'image/jpeg'),
        createTestFile('test-image-2.png', 'image/png')
      ]).then(files => {
        (window as any).testFiles = files;
      });
    });
    
    // Wait for files to be created
    await page.waitForTimeout(500);
    
    // Upload files using the file input
    const fileInput = page.locator('input[type="file"]');
    await page.evaluate((input) => {
      const files = (window as any).testFiles;
      const dt = new DataTransfer();
      files.forEach((file: File) => dt.items.add(file));
      (input as HTMLInputElement).files = dt.files;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }, await fileInput.elementHandle());
    
    // Wait for uploads to start and show progress
    await expect(page.locator('text=test-image-1.jpg')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=test-image-2.png')).toBeVisible({ timeout: 10000 });
    
    // Wait for uploads to complete
    await expect(page.locator('text=Upload complete').first()).toBeVisible({ timeout: 15000 });
    
    // Should show both files as completed
    const uploadCompleteElements = page.locator('text=Upload complete');
    await expect(uploadCompleteElements).toHaveCount(2);
    
    // Publish the post
    await page.click('[data-testid="publish-button"]');
    
    // Wait for success message
    await expect(page.locator('text=Post Published')).toBeVisible({ timeout: 10000 });
    
    // Verify the post composer resets
    await expect(page.locator('[data-testid="create-post-button"]')).toBeVisible();
  });

  test('should handle text-only posts', async ({ page }) => {
    // Expand composer
    await page.click('[data-testid="create-post-button"]');
    await page.waitForTimeout(1000);
    
    // Add title and content
    await page.fill('[data-testid="title-input"]', 'Text Only Post');
    await page.fill('[data-testid="content-textarea"]', 'This is a text-only post without any media.');
    
    // Publish
    await page.click('[data-testid="publish-button"]');
    
    // Should publish successfully
    await expect(page.locator('text=Post Published')).toBeVisible({ timeout: 10000 });
  });

  test('should show draft initialization when clicking media button', async ({ page }) => {
    // Click media button directly (which should expand and create draft)
    await page.click('button:has(svg)'); // Media icon button
    
    // Should expand composer and show media tab
    await expect(page.locator('[data-testid="post-composer-expanded"]')).toBeVisible();
    
    // Should show media upload area (with loading or ready state)
    await expect(page.locator('text=Upload your media files, text=Initializing draft')).toBeVisible();
  });
});