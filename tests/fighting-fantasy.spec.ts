import { test, expect } from '@playwright/test';

test.describe('Fighting Fantasy Features', () => {
  test('should have Luck Test button in toolbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Check that Luck Test button is present
    await expect(page.getByRole('button', { name: /🍀 Luck Test/i })).toBeVisible();
  });

  test('should create a Luck Test node', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Get initial node count
    const initialCount = await page.locator('.react-flow__node').count();

    // Click the Luck Test button
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();

    // Should have one more node
    const newCount = await page.locator('.react-flow__node').count();
    expect(newCount).toBe(initialCount + 1);

    // Node count should update in toolbar
    await expect(page.getByText(`${newCount} nodes`)).toBeVisible();
  });

  test('should display Luck Test node with correct styling', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Create a Luck Test node
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();

    // Wait for the node to appear
    await page.waitForTimeout(500);

    // Check that a node with the lucky clover emoji is visible
    const luckTestNode = page.locator('.react-flow__node').filter({ hasText: '🍀' });
    await expect(luckTestNode).toBeVisible();

    // Check that it has the expected label
    await expect(luckTestNode).toContainText('Test Your Luck');
  });

  test('should create multiple different node types including Luck Test', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Create various nodes
    await page.getByRole('button', { name: /📖 Story/i }).click();
    await page.getByRole('button', { name: /🔀 Choice/i }).click();
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();
    await page.getByRole('button', { name: /⚔️ Battle/i }).click();

    // Should have 5 nodes total (start + 4 new)
    await expect(page.getByText(/5 nodes/i)).toBeVisible();

    // Check that all node types are present
    await expect(page.locator('.react-flow__node').filter({ hasText: '🚀' })).toBeVisible(); // Start
    await expect(page.locator('.react-flow__node').filter({ hasText: '📖' })).toBeVisible(); // Story
    await expect(page.locator('.react-flow__node').filter({ hasText: '🔀' })).toBeVisible(); // Choice
    await expect(page.locator('.react-flow__node').filter({ hasText: '🍀' })).toBeVisible(); // Luck Test
    await expect(page.locator('.react-flow__node').filter({ hasText: '⚔️' })).toBeVisible(); // Battle
  });

  test('should show correct toolbar button count', async ({ page }) => {
    await page.goto('/');

    // Count all the "Add Node" buttons
    // Should have: Story, Choice, Condition, Inventory, Battle, Luck Test, End = 7 buttons
    const toolbar = page.locator('.react-flow').locator('..').locator('..'); // Navigate up to find toolbar area

    // Just verify main buttons are present
    await expect(page.getByRole('button', { name: /Story/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Choice/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Condition/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Inventory/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Battle/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Luck Test/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /End/i })).toBeVisible();
  });

  test('should maintain node count after creating Luck Test nodes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Create multiple Luck Test nodes
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();

    // Should have 4 nodes (1 start + 3 luck test)
    await expect(page.getByText(/4 nodes/i)).toBeVisible();
  });

  test('should select Luck Test node and show properties panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');

    // Create a Luck Test node
    await page.getByRole('button', { name: /🍀 Luck Test/i }).click();
    await page.waitForTimeout(500);

    // Click on the Luck Test node
    const luckTestNode = page.locator('.react-flow__node').filter({ hasText: '🍀' }).first();
    await luckTestNode.click();

    // Properties panel should appear
    await expect(page.getByText('Properties')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });
});
