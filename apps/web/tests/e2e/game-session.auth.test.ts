import { expect, test } from '@playwright/test';

// Helper to create a party and return its slug
async function createParty(page: import('@playwright/test').Page): Promise<string> {
  const partyName = `Session Test ${Date.now()}`;
  await page.goto('/create-party');
  await page.waitForLoadState('networkidle');

  const partyNameInput = page.getByTestId('partyName');
  await partyNameInput.click();
  await partyNameInput.fill(partyName);
  await page.waitForTimeout(300);
  await page.getByTestId('createPartySubmit').click();

  // Wait for URL to change from /create-party to something else
  await page.waitForURL((url) => !url.pathname.includes('create-party'), { timeout: 15000 });

  const slug = page.url().split('/').pop() || '';
  return slug;
}

test.describe('Game Session CRUD operations', () => {
  test('should create a new game session', async ({ page }) => {
    const partySlug = await createParty(page);
    const sessionName = `Test Session ${Date.now()}`;

    // Verify we're on the party page
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`/${partySlug}`);

    // Click the create session trigger
    await page.getByTestId('createSessionTrigger').click();

    // Fill in session name
    const sessionNameInput = page.getByTestId('sessionName');
    await expect(sessionNameInput).toBeVisible();
    await sessionNameInput.click();
    await sessionNameInput.fill(sessionName);
    await page.waitForTimeout(300);

    // Submit the form
    await page.getByTestId('createSessionSubmit').click();

    // Wait for the session to appear in the list
    await page.waitForTimeout(1000);

    // Verify the session appears on the page
    await expect(page.getByRole('heading', { name: sessionName })).toBeVisible();
  });

  test('should update game session name', async ({ page }) => {
    await createParty(page);
    const originalName = `Update Session ${Date.now()}`;

    await page.waitForLoadState('networkidle');

    // Create a session first
    await page.getByTestId('createSessionTrigger').click();
    const sessionNameInput = page.getByTestId('sessionName');
    await sessionNameInput.click();
    await sessionNameInput.fill(originalName);
    await page.waitForTimeout(300);
    await page.getByTestId('createSessionSubmit').click();
    await page.waitForTimeout(1000);

    // Find the session and open its menu
    const sessionCard = page.locator('.gameSessionCard', { hasText: originalName });
    await sessionCard.getByTestId('sessionMenuTrigger').click();

    // Wait for popover and find rename input
    const renameInput = page.getByTestId('renameSessionInput');
    await expect(renameInput).toBeVisible();

    // Update the name
    const newName = `Renamed Session ${Date.now()}`;
    await renameInput.clear();
    await renameInput.fill(newName);

    // Submit the rename
    await page.getByTestId('renameSessionSubmit').click();

    // Wait for the update to complete
    await page.waitForTimeout(1000);

    // Verify new name is displayed
    await expect(page.getByRole('heading', { name: newName })).toBeVisible();
  });

  test('should delete a game session', async ({ page }) => {
    await createParty(page);
    const sessionName = `Delete Session ${Date.now()}`;

    await page.waitForLoadState('networkidle');

    // Create a session first
    await page.getByTestId('createSessionTrigger').click();
    const sessionNameInput = page.getByTestId('sessionName');
    await sessionNameInput.click();
    await sessionNameInput.fill(sessionName);
    await page.waitForTimeout(300);
    await page.getByTestId('createSessionSubmit').click();
    await page.waitForTimeout(1000);

    // Find the session and open its menu
    const sessionCard = page.locator('.gameSessionCard', { hasText: sessionName });
    await sessionCard.getByTestId('sessionMenuTrigger').click();

    // Click delete button
    await page.getByTestId('deleteSessionButton').click();

    // Confirm deletion
    await page.getByTestId('confirmActionButton').click();

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Verify the session is no longer visible
    await expect(page.getByRole('heading', { name: sessionName })).not.toBeVisible();
  });

  test('should show error when creating session with empty name', async ({ page }) => {
    await createParty(page);
    await page.waitForLoadState('networkidle');

    // Click the create session trigger
    await page.getByTestId('createSessionTrigger').click();

    // Wait for form to appear
    await expect(page.getByTestId('createSessionSubmit')).toBeVisible();
    await page.waitForTimeout(300);

    // Try to submit with empty name
    await page.getByTestId('createSessionSubmit').click();

    // Wait for validation
    await page.waitForTimeout(500);

    // The form should show an error or stay open
    // Check if the form is still visible (didn't close successfully)
    const formIsStillVisible = await page.getByTestId('sessionName').isVisible();
    expect(formIsStillVisible).toBe(true);
  });
});
