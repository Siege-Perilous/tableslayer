import { expect, test } from '@playwright/test';

test.describe('API Key operations', () => {
  test.describe.configure({ mode: 'serial' });

  let createdApiKey: string | null = null;

  test('should create a new API key', async ({ page }) => {
    const keyName = `Test Key ${Date.now()}`;

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Verify API key manager is visible
    await expect(page.getByTestId('apiKeyManager')).toBeVisible();

    // Fill in key name
    const keyNameInput = page.getByTestId('apiKeyNameInput');
    await expect(keyNameInput).toBeVisible();
    await keyNameInput.click();
    await keyNameInput.fill(keyName);

    // Wait for Svelte state to update
    await page.waitForTimeout(300);

    // Generate the key
    const generateButton = page.getByTestId('apiKeyGenerateButton');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Wait for the key to be generated and displayed
    await expect(page.getByTestId('apiKeyValue')).toBeVisible({ timeout: 10000 });

    // Capture the generated key for the login test
    createdApiKey = await page.getByTestId('apiKeyValue').textContent();
    console.log(`[api-key.auth.test] Generated key: ${createdApiKey?.substring(0, 10)}...`);

    // Verify the key starts with ts_
    expect(createdApiKey).toMatch(/^ts_/);

    // Click Done to dismiss the key display
    await page.getByTestId('apiKeyDoneButton').click();

    // Verify the key appears in the list
    await expect(page.getByTestId('apiKeyList')).toBeVisible();
    await expect(page.getByTestId('apiKeyItem')).toBeVisible();
    await expect(page.getByTestId('apiKeyItemName').filter({ hasText: keyName })).toBeVisible();
  });

  test('should login with API key via URL', async ({ browser }) => {
    // Skip if no key was created
    if (!createdApiKey) {
      test.skip();
      return;
    }

    // Create a new browser context (incognito - no existing session)
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login with API key
      const loginUrl = `/login?key=${encodeURIComponent(createdApiKey)}&redirect=/profile`;
      console.log(`[api-key.auth.test] Testing key login with redirect to /profile`);

      await page.goto(loginUrl);

      // Should redirect to profile page after successful key login
      await page.waitForURL('/profile', { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Verify we're logged in by checking for profile content
      await expect(page.getByTestId('apiKeyManager')).toBeVisible({ timeout: 10000 });

      console.log(`[api-key.auth.test] Key login successful`);
    } finally {
      await context.close();
    }
  });

  test('should show error for invalid API key login', async ({ browser }) => {
    // Create a new browser context (incognito - no existing session)
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login with invalid API key
      const invalidKey = 'ts_invalidkey12345678901234567890';
      const loginUrl = `/login?key=${encodeURIComponent(invalidKey)}`;
      console.log(`[api-key.auth.test] Testing invalid key login`);

      await page.goto(loginUrl);
      await page.waitForLoadState('networkidle');

      // Should stay on login page and show error
      expect(page.url()).toContain('/login');

      // Look for error message
      await expect(page.getByText(/invalid api key/i)).toBeVisible({ timeout: 5000 });

      console.log(`[api-key.auth.test] Invalid key error displayed correctly`);
    } finally {
      await context.close();
    }
  });

  test('should delete an API key', async ({ page }) => {
    const keyName = `Delete Key ${Date.now()}`;

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Create a key to delete
    const keyNameInput = page.getByTestId('apiKeyNameInput');
    await keyNameInput.click();
    await keyNameInput.fill(keyName);
    await page.waitForTimeout(300);

    await page.getByTestId('apiKeyGenerateButton').click();
    await expect(page.getByTestId('apiKeyValue')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('apiKeyDoneButton').click();

    // Find the key item with our name and delete it
    const keyItem = page.getByTestId('apiKeyItem').filter({ hasText: keyName });
    await expect(keyItem).toBeVisible();

    // Click delete button on this key
    const deleteButton = keyItem.getByTestId('apiKeyDeleteButton');
    await deleteButton.click();

    // Confirm deletion
    await page.getByTestId('confirmActionButton').click();

    // Wait for the key to be removed from the list
    await expect(keyItem).not.toBeVisible({ timeout: 10000 });

    console.log(`[api-key.auth.test] Key deleted successfully`);
  });
});
