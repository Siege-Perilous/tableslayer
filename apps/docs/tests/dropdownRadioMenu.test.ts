import { expect, test } from '@playwright/test';

test('Test that menus work', async ({ page }) => {
  await page.goto('/menu');
  await page.waitForTimeout(500);
  await page.getByTestId('menuButton').first().click();
  await expect(page.getByTestId('menuItem')).toBeVisible({ timeout: 1000 });
});
