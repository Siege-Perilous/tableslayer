import { expect, test } from '@playwright/test';

test('index page has expected h1', async ({ page, baseURL }) => {
  console.log('Base URL in test:', baseURL);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Components' })).toBeVisible();
});
