import { test, expect } from '@playwright/test';

test.describe('Gamebook Creator - Item Library', () => {
  test('should toggle item library panel', async ({ page }) => {
    await page.goto('/');

    const toggleButton = page.getByRole('button', { name: /Item Library/i });

    // Initially should say "Show Item Library"
    await expect(toggleButton).toContainText('Show');

    // Click to show
    await toggleButton.click();

    // Should now say "Hide Item Library"
    await expect(toggleButton).toContainText('Hide');

    // Item Library panel should be visible
    await expect(page.getByText('Item Library')).toBeVisible();

    // Click to hide
    await toggleButton.click();

    // Should say "Show" again
    await expect(toggleButton).toContainText('Show');
  });

  test('should show empty state when no items exist', async ({ page }) => {
    await page.goto('/');

    // Open item library
    await page.getByRole('button', { name: /Show Item Library/i }).click();

    // Should show empty message
    await expect(page.getByText('No items yet. Create one to get started!')).toBeVisible();
  });

  test('should have New Item button in item library', async ({ page }) => {
    await page.goto('/');

    // Open item library
    await page.getByRole('button', { name: /Show Item Library/i }).click();

    // Should have "New Item" button
    await expect(page.getByRole('button', { name: '+ New Item' })).toBeVisible();
  });

  test('should open item creation dialog', async ({ page }) => {
    await page.goto('/');

    // Open item library
    await page.getByRole('button', { name: /Show Item Library/i }).click();

    // Click New Item
    await page.getByRole('button', { name: '+ New Item' }).click();

    // Dialog should open
    await expect(page.getByText('New Item')).toBeVisible();

    // Should have form fields
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();

    // Should have Save and Cancel buttons
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('should create a new item', async ({ page }) => {
    await page.goto('/');

    // Open item library
    await page.getByRole('button', { name: /Show Item Library/i }).click();

    // Click New Item
    await page.getByRole('button', { name: '+ New Item' }).click();

    // Fill in item details
    await page.getByLabel('Name').fill('Magic Sword');
    await page.getByLabel('Description').fill('A powerful enchanted weapon');

    // Click Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Item should appear in the list
    await expect(page.getByText('Magic Sword')).toBeVisible();
    await expect(page.getByText('A powerful enchanted weapon')).toBeVisible();
  });

  test('should cancel item creation', async ({ page }) => {
    await page.goto('/');

    // Open item library
    await page.getByRole('button', { name: /Show Item Library/i }).click();

    // Click New Item
    await page.getByRole('button', { name: '+ New Item' }).click();

    // Fill in item details
    await page.getByLabel('Name').fill('Test Item');

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close and item should NOT be in the list
    await expect(page.getByText('Test Item')).not.toBeVisible();
    await expect(page.getByText('No items yet')).toBeVisible();
  });
});
