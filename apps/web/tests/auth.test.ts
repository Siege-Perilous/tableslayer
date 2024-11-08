import { expect, test } from '@playwright/test';

test.describe('Login Page Tests', () => {
  test('should successfully load the login page and submit the login form', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Verify the page title and UI elements
    await expect(page.getByTestId('signInHeading')).toBeVisible();

    // Fill in the email and password fields
    await page.getByLabel('Email').fill('dave@test.com');
    await page.getByLabel('Password').fill('testtest');

    // Click on the sign-in button
    await page.getByTestId('loginSubmit').click();

    // Wait for any form validation or login response
    await page.waitForURL('/profile');

    // Assuming successful login redirects to a dashboard or similar page
    expect(page.url()).toContain('/profile');
  });

  test('should display validation error for empty fields', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Click the sign-in button without filling anything
    await page.getByTestId('loginSubmit').click();

    await page.getByLabel('Email').fill('dave');
    await page.getByLabel('Password').first().fill('test');

    // Expect to see validation errors for empty fields
    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=String must contain')).toBeVisible();
  });

  test('should display an error message for invalid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Fill in the form with incorrect credentials
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    // Click on the sign-in button
    await page.getByTestId('loginSubmit').click();

    // Expect an error message for invalid credentials
    await expect(page.getByTestId('messageError')).toBeVisible();
  });
});
