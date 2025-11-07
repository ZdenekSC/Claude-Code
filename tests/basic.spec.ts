import { test, expect } from '@playwright/test';

test.describe('Gamebook Creator - Basic Functionality', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check that the title is present
    await expect(page.getByRole('heading', { name: 'Gamebook Creator' })).toBeVisible();

    // Check that the subtitle is present
    await expect(page.getByText('Create interactive stories with React Flow')).toBeVisible();
  });

  test('should display the default start node', async ({ page }) => {
    await page.goto('/');

    // Wait for React Flow to render
    await page.waitForSelector('.react-flow');

    // Check that there's at least one node (the start node)
    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(1);
  });

  test('should show toolbar with all node type buttons', async ({ page }) => {
    await page.goto('/');

    // Check all node type buttons are present
    await expect(page.getByRole('button', { name: /Story/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Choice/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Condition/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Inventory/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Battle/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /End/i })).toBeVisible();
  });

  test('should have Save, Load, and Export buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export HTML' })).toBeVisible();
  });

  test('should have Play button for playback mode', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Play/i })).toBeVisible();
  });

  test('should show Item Library toggle button', async ({ page }) => {
    await page.goto('/');

    const itemLibraryButton = page.getByRole('button', { name: /Item Library/i });
    await expect(itemLibraryButton).toBeVisible();
  });

  test('should display node count in toolbar', async ({ page }) => {
    await page.goto('/');

    // Should show "1 nodes | 0 connections" initially
    await expect(page.getByText(/1 nodes/i)).toBeVisible();
    await expect(page.getByText(/0 connections/i)).toBeVisible();
  });
});
