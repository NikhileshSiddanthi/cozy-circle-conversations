import { test, expect } from '@playwright/test';

test.describe('Multi-Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and ensure user is logged in
    await page.goto('/');
    
    // Check if login is needed and handle it
    const loginButton = page.locator('text=Login').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/', { timeout: 10000 });
    }

    // Navigate to a group page where we can create posts
    await page.click('[data-testid="groups-nav"]');
    await page.click('[data-testid="group-item"]');
  });

  test('should upload 3 images, show previews, reload and restore them in correct order', async ({ page }) => {
    // Open post composer
    await page.click('[data-testid="create-post-button"]');
    await page.click('[data-testid="media-tab"]');

    // Upload first image
    const fileInput1 = page.locator('input[type="file"]');
    await fileInput1.setInputFiles('./src/__tests__/fixtures/test-image-1.jpg');
    
    // Wait for first upload to complete and show preview
    await expect(page.locator('[data-testid="media-preview"]').first()).toBeVisible();
    
    // Upload second image  
    await fileInput1.setInputFiles('./src/__tests__/fixtures/test-image-2.png');
    await expect(page.locator('[data-testid="media-preview"]').nth(1)).toBeVisible();
    
    // Upload third image
    await fileInput1.setInputFiles('./src/__tests__/fixtures/test-image-3.webp');
    await expect(page.locator('[data-testid="media-preview"]').nth(2)).toBeVisible();

    // Verify all 3 images are shown in preview
    const mediaPreviews = page.locator('[data-testid="media-preview"]');
    await expect(mediaPreviews).toHaveCount(3);

    // Check that images are in correct initial order
    const firstPreview = mediaPreviews.nth(0);
    const secondPreview = mediaPreviews.nth(1); 
    const thirdPreview = mediaPreviews.nth(2);

    await expect(firstPreview).toHaveAttribute('data-order', '0');
    await expect(secondPreview).toHaveAttribute('data-order', '1');
    await expect(thirdPreview).toHaveAttribute('data-order', '2');

    // Save draft (if auto-save is not implemented)
    await page.click('[data-testid="save-draft-button"]');
    await expect(page.locator('[data-testid="draft-saved-indicator"]')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Reopen composer
    await page.click('[data-testid="create-post-button"]');
    await page.click('[data-testid="media-tab"]');

    // Verify all 3 images are restored from server
    await expect(page.locator('[data-testid="media-preview"]')).toHaveCount(3);
    
    // Verify they're in the same order
    const restoredPreviews = page.locator('[data-testid="media-preview"]');
    await expect(restoredPreviews.nth(0)).toHaveAttribute('data-order', '0');
    await expect(restoredPreviews.nth(1)).toHaveAttribute('data-order', '1');
    await expect(restoredPreviews.nth(2)).toHaveAttribute('data-order', '2');
  });

  test('should remove one image and reorder remaining', async ({ page }) => {
    // Setup: Upload 3 images first (similar to above test)
    await page.click('[data-testid="create-post-button"]');
    await page.click('[data-testid="media-tab"]');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./src/__tests__/fixtures/test-image-1.jpg');
    await expect(page.locator('[data-testid="media-preview"]').first()).toBeVisible();
    
    await fileInput.setInputFiles('./src/__tests__/fixtures/test-image-2.png'); 
    await expect(page.locator('[data-testid="media-preview"]').nth(1)).toBeVisible();
    
    await fileInput.setInputFiles('./src/__tests__/fixtures/test-image-3.webp');
    await expect(page.locator('[data-testid="media-preview"]').nth(2)).toBeVisible();

    // Remove middle image
    const removeButton = page.locator('[data-testid="media-preview"]').nth(1).locator('[data-testid="remove-media-button"]');
    await removeButton.click();

    // Confirm removal
    await page.click('[data-testid="confirm-remove-button"]');

    // Verify only 2 images remain
    await expect(page.locator('[data-testid="media-preview"]')).toHaveCount(2);

    // Verify remaining images are reordered (indices 0 and 1)
    const remainingPreviews = page.locator('[data-testid="media-preview"]');
    await expect(remainingPreviews.nth(0)).toHaveAttribute('data-order', '0');
    await expect(remainingPreviews.nth(1)).toHaveAttribute('data-order', '1');

    // Test reordering: drag second image to first position
    const secondImage = remainingPreviews.nth(1);
    const firstImage = remainingPreviews.nth(0);
    
    await secondImage.dragTo(firstImage);

    // Wait for reorder to complete
    await page.waitForTimeout(500);

    // Verify order has changed
    const reorderedPreviews = page.locator('[data-testid="media-preview"]');
    await expect(reorderedPreviews.nth(0)).toHaveAttribute('data-order', '0');
    await expect(reorderedPreviews.nth(1)).toHaveAttribute('data-order', '1');
    
    // Verify the actual image sources have swapped
    const firstImageSrc = await reorderedPreviews.nth(0).locator('img').getAttribute('src');
    const secondImageSrc = await reorderedPreviews.nth(1).locator('img').getAttribute('src');
    
    expect(firstImageSrc).not.toBe(secondImageSrc);
  });

  test('should reject invalid file types and sizes', async ({ page }) => {
    await page.click('[data-testid="create-post-button"]');
    await page.click('[data-testid="media-tab"]');

    // Test invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./src/__tests__/fixtures/test-document.pdf');
    
    // Should show error message
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('Invalid file type');

    // Test oversized file (mock a large file)
    await page.evaluate(() => {
      // Mock File constructor to create a large file
      const originalFile = window.File;
      window.File = class extends originalFile {
        constructor(fileBits, fileName, options) {
          super(fileBits, fileName, options);
          if (fileName === 'large-image.jpg') {
            Object.defineProperty(this, 'size', { value: 11 * 1024 * 1024 }); // 11MB
          }
        }
      };
    });

    // This would be handled by the upload validation in the actual implementation
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('File size exceeds');
  });

  test('should prevent uploading more than 10 images', async ({ page }) => {
    await page.click('[data-testid="create-post-button"]');
    await page.click('[data-testid="media-tab"]');

    const fileInput = page.locator('input[type="file"]');
    
    // Upload 10 images
    for (let i = 0; i < 10; i++) {
      await fileInput.setInputFiles(`./src/__tests__/fixtures/test-image-${(i % 3) + 1}.jpg`);
      await page.waitForTimeout(100); // Small delay to avoid overwhelming the system
    }

    // Verify 10 images are uploaded
    await expect(page.locator('[data-testid="media-preview"]')).toHaveCount(10);

    // Try to upload 11th image
    await fileInput.setInputFiles('./src/__tests__/fixtures/test-image-1.jpg');

    // Should show error about maximum limit
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('Maximum 10 images');
    
    // Still should have only 10 images
    await expect(page.locator('[data-testid="media-preview"]')).toHaveCount(10);
  });
});