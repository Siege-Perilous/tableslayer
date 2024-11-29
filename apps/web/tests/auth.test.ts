import { expect, test } from '@playwright/test';

const uniqueEmail = `test+${Date.now()}@test.com`;

test.describe('Auth tests', () => {
  test('should successfully load the signup page and create a user', async ({ page }) => {
    await page.goto('/signup');
    await page.getByTestId('email').fill(uniqueEmail);
    await page.getByTestId('password').fill('testtest');
    await page.getByTestId('confirmPassword').fill('testtest');
    await page.getByTestId('signupSubmit').click();
    await page.waitForURL('/verify-email');
    await page.goto('/logout');
    await page.waitForURL('/login');
  });
  test('should successfully load the login page and submit the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('signInHeading')).toBeVisible();
    await page.getByTestId('email').fill(uniqueEmail);
    await page.getByTestId('password').fill('testtest');
    await page.getByTestId('loginSubmit').click();
    await page.waitForURL('/profile');
  });
  test('should display validation error for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('loginSubmit').click();
    await page.getByTestId('email').fill('dave');
    await page.getByTestId('password').first().fill('test');
    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=String must contain')).toBeVisible();
  });
  test('should display an error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email').fill('wrong@example.com');
    await page.getByTestId('password').fill('wrongpassword');
    await page.getByTestId('loginSubmit').click();
    await expect(page.getByTestId('messageError')).toBeVisible();
  });
});

test.use({ launchOptions: { slowMo: 1000 } });
