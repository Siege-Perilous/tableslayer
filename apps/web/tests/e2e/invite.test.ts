import { expect, test } from '@playwright/test';

test.describe('Invite tests', () => {
  test('invalid code tests', async ({ page }) => {
    await page.goto('/accept-invite/1234');
    await page.waitForURL('/invalid-invite?error=invalid-code');
    expect(page.url()).toContain('/invalid-invite?error=invalid-code');
  });
});
