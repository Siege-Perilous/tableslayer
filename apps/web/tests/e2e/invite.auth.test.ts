import { expect, test } from '@playwright/test';

// Helper to create a party and return its slug
async function createParty(page: import('@playwright/test').Page): Promise<string> {
  const partyName = `Invite Test ${Date.now()}`;
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

test.describe('Party Invite operations', () => {
  test.describe.configure({ mode: 'parallel' });
  test('should create an invite by entering an email', async ({ page }) => {
    const partySlug = await createParty(page);

    // Navigate to party page (should already be there after creation)
    await page.goto(`/${partySlug}`);
    await page.waitForLoadState('networkidle');

    // Find the invite form
    const inviteInput = page.locator('input[type="email"][placeholder="email address"]');
    await expect(inviteInput).toBeVisible({ timeout: 10000 });

    // Enter an email address
    const testEmail = `test+${Date.now()}@example.com`;
    await inviteInput.fill(testEmail);

    // Submit the form by clicking the mail icon button
    const submitBtn = page.getByTestId('inviteFormSubmit');
    await submitBtn.click();

    // Wait for the success toast
    await expect(page.locator('text=Invite sent!')).toBeVisible({ timeout: 10000 });

    // Verify the pending invite appears in the list
    const pendingInvite = page.getByTestId('pendingInvite').filter({ hasText: testEmail });
    await expect(pendingInvite).toBeVisible({ timeout: 10000 });
  });

  test('should cancel a pending invite', async ({ page }) => {
    const partySlug = await createParty(page);

    // Navigate to party page
    await page.goto(`/${partySlug}`);
    await page.waitForLoadState('networkidle');

    // Create an invite first
    const inviteInput = page.locator('input[type="email"][placeholder="email address"]');
    await expect(inviteInput).toBeVisible({ timeout: 10000 });

    const testEmail = `cancel+${Date.now()}@example.com`;
    await inviteInput.fill(testEmail);

    const submitBtn = page.getByTestId('inviteFormSubmit');
    await submitBtn.click();

    // Wait for invite to appear in the list
    const pendingInvite = page.getByTestId('pendingInvite').filter({ hasText: testEmail });
    await expect(pendingInvite).toBeVisible({ timeout: 10000 });

    // Click on the pending invite to open the popover
    await pendingInvite.click();

    // Wait for popover to appear and click "Cancel invite"
    const cancelBtn = page.locator('button:has-text("Cancel invite")');
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });
    await cancelBtn.click();

    // Wait for success toast
    await expect(page.locator('text=Invite cancelled')).toBeVisible({ timeout: 10000 });

    // Verify the invite is no longer in the list
    await expect(pendingInvite).not.toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid email', async ({ page }) => {
    const partySlug = await createParty(page);

    // Navigate to party page
    await page.goto(`/${partySlug}`);
    await page.waitForLoadState('networkidle');

    // Find the invite form
    const inviteInput = page.locator('input[type="email"][placeholder="email address"]');
    await expect(inviteInput).toBeVisible({ timeout: 10000 });

    // Enter an invalid email
    await inviteInput.fill('not-an-email');

    // Submit the form
    const submitBtn = page.getByTestId('inviteFormSubmit');
    await submitBtn.click();

    // Wait a moment for validation
    await page.waitForTimeout(500);

    // The browser's built-in email validation should prevent submission
    // or we should see a validation error
    // Check if we're still on the same page without a success toast
    await expect(page.locator('text=Invite sent!')).not.toBeVisible({ timeout: 2000 });
  });

  test('should show party members section', async ({ page }) => {
    const partySlug = await createParty(page);

    // Navigate to party page
    await page.goto(`/${partySlug}`);
    await page.waitForLoadState('networkidle');

    // Verify the party members section exists
    await expect(page.locator('text=Party members')).toBeVisible({ timeout: 10000 });

    // Verify at least one member (the creator) is shown
    // The creator should be shown with their email or as a PartyMember
    const membersList = page.getByTestId('partyMembers');
    await expect(membersList).toBeVisible({ timeout: 5000 });
  });
});
