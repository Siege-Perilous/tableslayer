import { expect, test } from '@playwright/test';

test('Test that toasts work', async ({ page }) => {
  await page.goto('/toast');
  await page.waitForTimeout(500);
  await page.getByTestId('toastButton').first().click();
  await expect(page.getByTestId('toast')).toBeVisible({ timeout: 1000 });
});
