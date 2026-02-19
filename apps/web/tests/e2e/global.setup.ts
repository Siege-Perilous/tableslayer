import { chromium, type FullConfig } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const authFile = join(__dirname, '.auth/user.json');

const globalSetup = async (config: FullConfig) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:5174';

  // Use provided credentials or create a test user
  let testEmail = process.env.TEST_USER_EMAIL;
  let testPassword = process.env.TEST_USER_PASSWORD;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging for debugging
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  try {
    // If no credentials provided, create a new test user
    if (!testEmail || !testPassword) {
      testEmail = `playwright+${Date.now()}@test.com`;
      testPassword = 'testpassword123';

      console.log(`Creating test user: ${testEmail}`);

      await page.goto(`${baseURL}/signup`);
      console.log('Loaded signup page');

      // Wait for hydration - the button should be enabled
      await page.waitForLoadState('networkidle');
      console.log('Network idle');

      // Check if the submit button exists
      const submitButton = page.getByTestId('signupSubmit');
      await submitButton.waitFor({ state: 'visible' });
      console.log('Submit button visible');

      // Fill form fields one at a time with delays
      const emailInput = page.getByTestId('email');
      await emailInput.click();
      await emailInput.fill(testEmail);
      console.log('Email filled');

      const passwordInput = page.getByTestId('password');
      await passwordInput.click();
      await passwordInput.fill(testPassword);
      console.log('Password filled');

      const confirmInput = page.getByTestId('confirmPassword');
      await confirmInput.click();
      await confirmInput.fill(testPassword);
      console.log('Confirm password filled');

      // Wait a moment for Svelte to update state
      await page.waitForTimeout(500);

      // Click the submit button
      console.log('Clicking submit button...');
      await submitButton.click();

      // Wait for navigation or timeout
      try {
        await page.waitForURL((url) => !url.pathname.startsWith('/signup'), { timeout: 15000 });
        console.log(`Navigated to: ${page.url()}`);
      } catch (navError) {
        console.log(`Current URL after click: ${page.url()}`);
        // Check if there's an error message on the page
        const pageContent = await page.content();
        if (pageContent.includes('error') || pageContent.includes('Error')) {
          console.log('Page may contain an error');
        }
        throw navError;
      }

      console.log('Test user created');
    } else {
      // Login with existing credentials
      console.log(`Logging in as: ${testEmail}`);

      await page.goto(`${baseURL}/login`);
      await page.waitForLoadState('networkidle');

      await page.getByTestId('email').fill(testEmail);
      await page.getByTestId('password').fill(testPassword);
      await page.getByTestId('loginSubmit').click();

      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
      console.log(`Navigated to: ${page.url()}`);
    }

    // Save storage state (cookies + localStorage)
    await context.storageState({ path: authFile });

    console.log('Auth state saved successfully');
  } catch (error) {
    console.error('Failed to set up auth state:', error);
    throw error;
  } finally {
    await browser.close();
  }
};

export default globalSetup;
