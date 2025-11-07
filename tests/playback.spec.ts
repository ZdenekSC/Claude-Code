import { test, expect } from '@playwright/test';

test.describe('Gamebook Creator - Playback Mode', () => {
  test('should enter playback mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Click the Play button
    await page.getByRole('button', { name: /▶️ Play/i }).click();

    // Should show the game playback screen
    await expect(page.getByRole('button', { name: 'Start Adventure' })).toBeVisible();

    // Should show Exit Playback button
    await expect(page.getByRole('button', { name: 'Exit Playback' })).toBeVisible();
  });

  test('should display stats panel in playback mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Enter playback mode
    await page.getByRole('button', { name: /▶️ Play/i }).click();

    // Should show Stats heading
    await expect(page.getByText('Stats', { exact: true })).toBeVisible();

    // Should show Health and Gold
    await expect(page.getByText(/Health:/i)).toBeVisible();
    await expect(page.getByText(/Gold:/i)).toBeVisible();
  });

  test('should display inventory panel in playback mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Enter playback mode
    await page.getByRole('button', { name: /▶️ Play/i }).click();

    // Should show Inventory heading
    await expect(page.getByText('Inventory', { exact: true })).toBeVisible();

    // Initially should be empty
    await expect(page.getByText('Empty')).toBeVisible();
  });

  test('should exit playback mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Enter playback mode
    await page.getByRole('button', { name: /▶️ Play/i }).click();

    // Verify we're in playback mode
    await expect(page.getByRole('button', { name: 'Exit Playback' })).toBeVisible();

    // Exit playback mode
    await page.getByRole('button', { name: 'Exit Playback' }).click();

    // Should be back in editor mode
    await expect(page.getByRole('heading', { name: 'Gamebook Creator' })).toBeVisible();
    await expect(page.getByRole('button', { name: /▶️ Play/i })).toBeVisible();
  });

  test('should show game title in playback mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Enter playback mode
    await page.getByRole('button', { name: /▶️ Play/i }).click();

    // Should show the default game title (from start node)
    await expect(page.getByText('My Gamebook')).toBeVisible();
  });
});
