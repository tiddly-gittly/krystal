import { expect, test } from '@playwright/test';

test.describe('Krystal Layout', () => {
  test('should load the page and show the Krystal layout', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check the page title
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should display the story river container', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the story river exists
    const storyRiver = page.locator('.tc-story-river');
    await expect(storyRiver).toBeAttached();
  });
});

test.describe('Krystal Drag Handle', () => {
  test('should render drag handles on tiddler frames in Krystal layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for any tiddler frames to appear
    const frames = page.locator('.tc-tiddler-frame');
    const frameCount = await frames.count();

    if (frameCount > 0) {
      // Check that drag handles are injected
      const dragHandles = page.locator('.krystal-drag-handle');
      const handleCount = await dragHandles.count();
      expect(handleCount).toBeGreaterThanOrEqual(frameCount);
    }
  });

  test('should show drag handle on hover', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const frames = page.locator('.tc-tiddler-frame');
    const frameCount = await frames.count();

    if (frameCount > 0) {
      const firstFrame = frames.first();
      const dragHandle = firstFrame.locator('.krystal-drag-handle');

      // Before hover, drag handle should exist but may be hidden
      await expect(dragHandle).toBeAttached();

      // Hover over the frame
      await firstFrame.hover();

      // After hover, drag handle should be visible
      await expect(dragHandle).toBeVisible();
    }
  });
});

test.describe('Krystal header', () => {
  test('should render header elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for krystal header
    const header = page.locator('.krystal-header');
    await expect(header.first()).toBeAttached();
  });
});
