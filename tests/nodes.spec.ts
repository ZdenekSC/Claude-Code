import { test, expect } from '@playwright/test';

test.describe('Gamebook Creator - Node Operations', () => {
  test('should create a story node', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('.react-flow');

    // Click the Story button
    await page.getByRole('button', { name: /📖 Story/i }).click();

    // Should now have 2 nodes (start + story)
    await expect(page.getByText(/2 nodes/i)).toBeVisible();
  });

  test('should create multiple node types', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Create different node types
    await page.getByRole('button', { name: /📖 Story/i }).click();
    await page.getByRole('button', { name: /🔀 Choice/i }).click();
    await page.getByRole('button', { name: /❓ Condition/i }).click();

    // Should have 4 nodes total (start + 3 new nodes)
    await expect(page.getByText(/4 nodes/i)).toBeVisible();
  });

  test('should select a node and show properties panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Click on the start node
    const startNode = page.locator('.react-flow__node').first();
    await startNode.click();

    // Properties panel should show
    await expect(page.getByText('Properties')).toBeVisible();

    // Should show Delete button
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('should show "Select a node" message when no node is selected', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Initially no node is selected
    await expect(page.getByText('Select a node to edit its properties')).toBeVisible();
  });

  test('should create an end node', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    await page.getByRole('button', { name: /🏁 End/i }).click();

    // Should have 2 nodes
    await expect(page.getByText(/2 nodes/i)).toBeVisible();
  });

  test('should create a battle node', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    await page.getByRole('button', { name: /⚔️ Battle/i }).click();

    // Should have 2 nodes
    await expect(page.getByText(/2 nodes/i)).toBeVisible();
  });

  test('should create an inventory node', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    await page.getByRole('button', { name: /🎒 Inventory/i }).click();

    // Should have 2 nodes
    await expect(page.getByText(/2 nodes/i)).toBeVisible();
  });
});
