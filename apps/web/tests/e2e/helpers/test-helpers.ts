import { expect, type Page } from '@playwright/test';

/**
 * Creates a party and returns its slug.
 * Uses robust waiting strategies to avoid flakiness.
 */
export async function createParty(page: Page): Promise<string> {
  const partyName = `Test Party ${Date.now()}`;

  await page.goto('/create-party');
  await page.waitForLoadState('networkidle');

  // Wait for form to be ready
  const partyNameInput = page.getByTestId('partyName');
  await expect(partyNameInput).toBeVisible();
  // Use force:true to bypass stability checks that can timeout in CI
  await partyNameInput.click({ force: true });
  await partyNameInput.fill(partyName);

  // Wait for submit button to be enabled (form validation passed)
  const submitBtn = page.getByTestId('createPartySubmit');
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });

  // Click and wait for navigation with retry logic
  await expect(async () => {
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.includes('create-party'), { timeout: 10000 });
  }).toPass({ timeout: 20000, intervals: [1000] });

  const slug = page.url().split('/').pop() || '';
  return slug;
}

/**
 * Creates a party and a game session, returns both slugs.
 * Uses robust waiting strategies to avoid flakiness.
 */
export async function createPartyAndSession(page: Page): Promise<{ partySlug: string; sessionSlug: string }> {
  const partySlug = await createParty(page);

  // Wait for party page to fully load
  await page.waitForLoadState('networkidle');

  // Wait for and click the create session trigger
  const createSessionTrigger = page.getByTestId('createSessionTrigger');
  await expect(createSessionTrigger).toBeVisible({ timeout: 10000 });
  await createSessionTrigger.click();

  // Fill in session name
  const sessionNameInput = page.getByTestId('sessionName');
  await expect(sessionNameInput).toBeVisible({ timeout: 5000 });
  // Use force:true to bypass stability checks that can timeout in CI
  await sessionNameInput.click({ force: true });
  const sessionName = `Test Session ${Date.now()}`;
  await sessionNameInput.fill(sessionName);

  // Wait for submit button to be enabled
  const submitBtn = page.getByTestId('createSessionSubmit');
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();

  // Wait for the session to appear - use heading which is more reliable
  await expect(page.getByRole('heading', { name: sessionName })).toBeVisible({ timeout: 20000 });

  // Wait for network to settle after creation
  await page.waitForLoadState('networkidle');

  // Get the session slug from the created session link
  const sessionCard = page.locator('.gameSessionCard', { hasText: sessionName }).first();
  const sessionLink = sessionCard.locator('a').first();
  await expect(sessionLink).toBeVisible({ timeout: 5000 });
  const href = (await sessionLink.getAttribute('href')) || '';
  const sessionSlug = href.split('/').pop() || '';

  return { partySlug, sessionSlug };
}

/**
 * Waits for the scene editor to fully load including ThreeJS canvas.
 */
export async function waitForSceneEditor(page: Page) {
  // Wait for the scenes container to be visible
  await page.waitForSelector('.scenes', { state: 'visible', timeout: 15000 });

  // Wait for the "Add scene" button to be ready and enabled
  const addSceneBtn = page.locator('.scene__inputBtn');
  await expect(addSceneBtn).toBeVisible({ timeout: 10000 });
  await expect(addSceneBtn).not.toBeDisabled({ timeout: 10000 });

  // Wait for canvas to be visible (ThreeJS initialization)
  await page.waitForSelector('canvas', { state: 'visible', timeout: 15000 });

  // Wait for network to settle
  await page.waitForLoadState('networkidle');

  // Give ThreeJS and animations time to fully initialize and stabilize
  await page.waitForTimeout(1000);
}

/**
 * Waits for the marker tool to be ready and activated.
 */
export async function activateMarkerTool(page: Page) {
  const markerToolBtn = page.getByTestId('markerToolButton');
  await expect(markerToolBtn).toBeVisible({ timeout: 10000 });

  // Use force:true to bypass tooltip overlay that can block clicks
  await markerToolBtn.click({ force: true });

  // Wait for marker panel to be visible (more reliable than text which may be hidden)
  await expect(page.locator('.markerManager')).toBeVisible({ timeout: 10000 });
}

/**
 * Clicks on the center of the canvas.
 */
export async function clickCanvasCenter(page: Page) {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas bounding box not found');

  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
}

/**
 * Uploads a file to the scene input with retry logic for CI stability.
 */
export async function uploadSceneFile(page: Page, filePath: string) {
  // Wait for the add scene button to be enabled
  const addSceneBtn = page.locator('.scene__inputBtn');
  await expect(addSceneBtn).toBeVisible({ timeout: 15000 });
  await expect(addSceneBtn).not.toBeDisabled({ timeout: 15000 });

  // Wait a moment for any animations to settle
  await page.waitForTimeout(500);

  // Get the file input - it's hidden (opacity: 0) but still accessible
  const fileInput = page.locator('.scene__input input[type="file"]');

  // Wait for the input to be attached to DOM
  await fileInput.waitFor({ state: 'attached', timeout: 15000 });

  // Use retry pattern for setting files (handles stability issues)
  await expect(async () => {
    await fileInput.setInputFiles(filePath);
  }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
}
