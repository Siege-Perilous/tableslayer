import { expect, test } from '@playwright/test';

const uniqueEmail = `test+${Date.now()}@test.com`;

test.describe('Auth tests', () => {
  test('should successfully load the signup page and create a user', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByTestId('password').fill('testtest');
    await page.getByTestId('confirmPassword').fill('testtest');
    await page.getByTestId('signupSubmit').click();
    await page.waitForURL('/verify-email');
    expect(page.url()).toContain('/verify-email');
    await page.goto('/logout');
    await page.waitForURL('/login');
  });
  test('should successfully load the login page and submit the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('signInHeading')).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password').fill('testtest');
    await page.getByTestId('loginSubmit').click();
    await page.waitForURL('/profile');
    expect(page.url()).toContain('/profile');
  });
  test('should display validation error for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('loginSubmit').click();
    await page.getByLabel('Email').fill('dave');
    await page.getByLabel('Password').first().fill('test');
    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=String must contain')).toBeVisible();
  });
  test('should display an error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByTestId('loginSubmit').click();
    await expect(page.getByTestId('messageError')).toBeVisible();
  });
});
