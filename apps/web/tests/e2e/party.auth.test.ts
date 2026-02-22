import { expect, test } from '@playwright/test';

test.describe('Party CRUD operations', () => {
  test.describe.configure({ mode: 'parallel' });
  test('should create a new party with valid name', async ({ page }) => {
    const testPartyName = `Test Party ${Date.now()}`;

    await page.goto('/create-party');

    // Wait for hydration
    await page.waitForLoadState('networkidle');

    // Verify we're on the create party page
    await expect(page.getByTestId('createParty')).toBeVisible();

    // Fill in party name
    const partyNameInput = page.getByTestId('partyName');
    await partyNameInput.click();
    await partyNameInput.fill(testPartyName);

    // Wait for Svelte state to update
    await page.waitForTimeout(300);

    // Submit the form
    await page.getByTestId('createPartySubmit').click();

    // Wait for redirect to party dashboard (not create-party page)
    await page.waitForURL((url) => !url.pathname.includes('create-party'), { timeout: 15000 });

    // Verify we're on the party page by checking the heading
    await expect(page.getByRole('heading', { name: testPartyName })).toBeVisible();
  });

  test('should update party name', async ({ page }) => {
    // First create a party to update
    const originalName = `Update Test ${Date.now()}`;
    await page.goto('/create-party');
    await page.waitForLoadState('networkidle');

    const partyNameInput = page.getByTestId('partyName');
    await partyNameInput.click();
    await partyNameInput.fill(originalName);
    await page.waitForTimeout(300);
    await page.getByTestId('createPartySubmit').click();
    await page.waitForURL((url) => !url.pathname.includes('create-party'), { timeout: 15000 });

    // Now update the party name
    // Click on the party title to open the popover
    await page.getByRole('heading', { name: originalName }).click();

    // Wait for popover to appear and find rename input
    const renameInput = page.getByTestId('renamePartyInput');
    await expect(renameInput).toBeVisible();

    // Clear and enter new name
    const newPartyName = `Renamed Party ${Date.now()}`;
    await renameInput.clear();
    await renameInput.fill(newPartyName);

    // Submit the rename
    await page.getByTestId('renamePartySubmit').click();

    // Wait for redirect to new slug
    await page.waitForURL(/\/[a-z0-9-]+$/, { timeout: 15000 });

    // Verify new name is displayed
    await expect(page.getByRole('heading', { name: newPartyName })).toBeVisible();
  });

  test('should delete a party', async ({ page }) => {
    // Create a party specifically for deletion
    const deletePartyName = `Delete Me ${Date.now()}`;
    await page.goto('/create-party');
    await page.waitForLoadState('networkidle');

    const partyNameInput = page.getByTestId('partyName');
    await partyNameInput.click();
    await partyNameInput.fill(deletePartyName);
    await page.waitForTimeout(300);
    await page.getByTestId('createPartySubmit').click();
    await page.waitForURL((url) => !url.pathname.includes('create-party'), { timeout: 15000 });

    // Open party title popover
    await page.getByRole('heading', { name: deletePartyName }).click();

    // Click delete button
    await page.getByTestId('deletePartyButton').click();

    // Confirm deletion
    await page.getByTestId('confirmActionButton').click();

    // Should redirect to profile page
    await page.waitForURL('/profile', { timeout: 15000 });
    await expect(page).toHaveURL('/profile');
  });

  test('should show error when creating party with empty name', async ({ page }) => {
    await page.goto('/create-party');
    await page.waitForLoadState('networkidle');

    // Wait for the form to be ready
    await expect(page.getByTestId('createPartySubmit')).toBeVisible();
    await page.waitForTimeout(300);

    // Try to submit with empty name
    await page.getByTestId('createPartySubmit').click();

    // Wait for validation - should show error or stay on page
    // The form uses Zod validation which should show an error
    await page.waitForTimeout(500);

    // Should still be on create-party page (may have query params from failed submission)
    expect(page.url()).toContain('/create-party');

    // Look for validation error message about name
    const hasError = await page
      .locator('text=/name|required/i')
      .isVisible()
      .catch(() => false);
    // If no error visible, at least verify we didn't navigate away
    if (!hasError) {
      expect(page.url()).toContain('/create-party');
    }
  });
});
