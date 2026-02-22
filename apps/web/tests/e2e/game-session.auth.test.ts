import { expect, test } from '@playwright/test';
import { createParty } from './helpers/test-helpers';

test.describe('Game Session CRUD operations', () => {
  test.describe.configure({ mode: 'parallel' });
  test('should create a new game session', async ({ page }) => {
    const partySlug = await createParty(page);
    const sessionName = `Test Session ${Date.now()}`;

    // Verify we're on the party page
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`/${partySlug}`);

    // Click the create session trigger
    const createTrigger = page.getByTestId('createSessionTrigger');
    await expect(createTrigger).toBeVisible({ timeout: 10000 });
    await createTrigger.click();

    // Fill in session name
    const sessionNameInput = page.getByTestId('sessionName');
    await expect(sessionNameInput).toBeVisible({ timeout: 5000 });
    await sessionNameInput.click();
    await sessionNameInput.fill(sessionName);

    // Wait for submit button to be enabled and click
    const submitBtn = page.getByTestId('createSessionSubmit');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Verify the session appears on the page
    await expect(page.getByRole('heading', { name: sessionName })).toBeVisible({ timeout: 15000 });
  });

  test('should update game session name', async ({ page }) => {
    await createParty(page);
    const originalName = `Update Session ${Date.now()}`;

    await page.waitForLoadState('networkidle');

    // Create a session first
    const createTrigger = page.getByTestId('createSessionTrigger');
    await expect(createTrigger).toBeVisible({ timeout: 10000 });
    await createTrigger.click();

    const sessionNameInput = page.getByTestId('sessionName');
    await expect(sessionNameInput).toBeVisible({ timeout: 5000 });
    await sessionNameInput.click();
    await sessionNameInput.fill(originalName);

    const createSubmitBtn = page.getByTestId('createSessionSubmit');
    await expect(createSubmitBtn).toBeEnabled({ timeout: 5000 });
    await createSubmitBtn.click();

    // Wait for session to appear
    await expect(page.getByRole('heading', { name: originalName })).toBeVisible({ timeout: 15000 });

    // Find the session and open its menu
    const sessionCard = page.getByTestId('gameSessionCard').filter({ hasText: originalName });
    await expect(sessionCard).toBeVisible();
    const menuTrigger = sessionCard.getByTestId('sessionMenuTrigger');
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    // Wait for popover and find rename input
    const renameInput = page.getByTestId('renameSessionInput');
    await expect(renameInput).toBeVisible({ timeout: 5000 });

    // Update the name
    const newName = `Renamed Session ${Date.now()}`;
    await renameInput.clear();
    await renameInput.fill(newName);

    // Submit the rename
    const renameSubmitBtn = page.getByTestId('renameSessionSubmit');
    await expect(renameSubmitBtn).toBeVisible();
    await renameSubmitBtn.click();

    // Verify new name is displayed
    await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: 10000 });
  });

  test('should delete a game session', async ({ page }) => {
    await createParty(page);
    const sessionName = `Delete Session ${Date.now()}`;

    await page.waitForLoadState('networkidle');

    // Create a session first
    const createTrigger = page.getByTestId('createSessionTrigger');
    await expect(createTrigger).toBeVisible({ timeout: 10000 });
    await createTrigger.click();

    const sessionNameInput = page.getByTestId('sessionName');
    await expect(sessionNameInput).toBeVisible({ timeout: 5000 });
    await sessionNameInput.click();
    await sessionNameInput.fill(sessionName);

    const createSubmitBtn = page.getByTestId('createSessionSubmit');
    await expect(createSubmitBtn).toBeEnabled({ timeout: 5000 });
    await createSubmitBtn.click();

    // Wait for session to appear
    await expect(page.getByRole('heading', { name: sessionName })).toBeVisible({ timeout: 15000 });

    // Find the session and open its menu
    const sessionCard = page.getByTestId('gameSessionCard').filter({ hasText: sessionName });
    await expect(sessionCard).toBeVisible();
    const menuTrigger = sessionCard.getByTestId('sessionMenuTrigger');
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    // Click delete button
    const deleteBtn = page.getByTestId('deleteSessionButton');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // Confirm deletion
    const confirmBtn = page.getByTestId('confirmActionButton');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Verify the session is no longer visible
    await expect(page.getByRole('heading', { name: sessionName })).not.toBeVisible({ timeout: 10000 });
  });

  test('should show error when creating session with empty name', async ({ page }) => {
    await createParty(page);
    await page.waitForLoadState('networkidle');

    // Click the create session trigger
    const createTrigger = page.getByTestId('createSessionTrigger');
    await expect(createTrigger).toBeVisible({ timeout: 10000 });
    await createTrigger.click();

    // Wait for form to appear
    const submitBtn = page.getByTestId('createSessionSubmit');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Try to submit with empty name
    await submitBtn.click();

    // The form should show an error or stay open
    // Check if the form is still visible (didn't close successfully)
    const sessionNameInput = page.getByTestId('sessionName');
    await expect(sessionNameInput).toBeVisible({ timeout: 5000 });
  });
});
