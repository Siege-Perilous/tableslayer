import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testImagePath = path.join(__dirname, 'fixtures/test-image.png');

// Helper to create a party and game session, returns the URL to the editor
async function createPartyAndSession(
  page: import('@playwright/test').Page
): Promise<{ partySlug: string; sessionSlug: string }> {
  const partyName = `Scene Test ${Date.now()}`;

  // Create party
  await page.goto('/create-party');
  await page.waitForLoadState('networkidle');
  const partyNameInput = page.getByTestId('partyName');
  await partyNameInput.click();
  await partyNameInput.fill(partyName);
  await page.waitForTimeout(300);
  await page.getByTestId('createPartySubmit').click();
  await page.waitForURL((url) => !url.pathname.includes('create-party'), { timeout: 15000 });

  const partySlug = page.url().split('/').pop() || '';

  // Create game session
  await page.getByTestId('createSessionTrigger').click();
  const sessionNameInput = page.getByTestId('sessionName');
  await sessionNameInput.click();
  await sessionNameInput.fill(`Test Session ${Date.now()}`);
  await page.waitForTimeout(300);
  await page.getByTestId('createSessionSubmit').click();
  await page.waitForTimeout(1000);

  // Get the session slug from the created session link
  const sessionLink = page.locator('.gameSessionCard a').first();
  const href = (await sessionLink.getAttribute('href')) || '';
  const sessionSlug = href.split('/').pop() || '';

  return { partySlug, sessionSlug };
}

// Helper to wait for the scene editor to fully load
async function waitForSceneEditor(page: import('@playwright/test').Page) {
  // Wait for the scenes container to be visible
  await page.waitForSelector('.scenes', { state: 'visible', timeout: 10000 });
  // Wait for the "Add scene" button to be ready
  await page.waitForSelector('.scene__inputBtn', { state: 'visible', timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Scene CRUD operations', () => {
  test('should create a scene by uploading an image', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Count initial scenes (new sessions may start with a default "First scene")
    const initialSceneCount = await page.locator('.scene__list .scene').count();

    // Find the file input inside the "Add scene" button
    const fileInput = page.locator('.scene__input input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Wait for the scene creation to complete by checking the scene count increases
    // This also waits for the "Add scene" button to be enabled again (formIsLoading = false)
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(initialSceneCount + 1);
    }).toPass({ timeout: 15000 });

    // Verify the "Add scene" button is enabled (scene creation completed)
    const addSceneBtn = page.locator('.scene__inputBtn');
    await expect(addSceneBtn).not.toBeDisabled();
  });

  test('should rename a scene', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Wait for the scene list to have at least one scene (default "First scene")
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 10000 });

    // Get the original scene name from the first scene
    const sceneText = page.locator('.scene__list .scene__text').first();
    const originalName = await sceneText.textContent();

    // Open scene popover by right-clicking on the scene
    const scene = page.locator('.scene__list .scene').first();
    await scene.click({ button: 'right' });

    // Wait for popover menu to appear and click "Rename scene"
    await page.waitForSelector('.scene__menuItem', { state: 'visible', timeout: 5000 });
    await page.locator('.scene__menuItem').filter({ hasText: 'Rename scene' }).click();

    // Fill in new name
    const renameInput = page.locator('.scene__renameInput input');
    await expect(renameInput).toBeVisible();
    const newName = `Renamed ${Date.now()}`;
    await renameInput.fill(newName);

    // Submit rename by clicking the check button
    await page.locator('.scene__renameInput button').first().click();

    // Wait for rename to complete by checking name changed
    await expect(sceneText).toContainText(newName, { timeout: 10000 });
    expect(await sceneText.textContent()).not.toEqual(originalName);
  });

  test('should delete a scene via context menu', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Wait for the scene list to have the default scene
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 10000 });

    // Create an additional scene so we have 2 (deleting the only scene might not be allowed)
    const fileInput = page.locator('.scene__input input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Wait for second scene to appear
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(2);
    }).toPass({ timeout: 15000 });

    // Get current count before deletion
    const initialCount = await page.locator('.scene__list .scene').count();
    expect(initialCount).toBe(2);

    // Open scene menu via the chevron button on the second scene
    const scenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').nth(1);
    await scenePopoverBtn.click();

    // Wait for popover menu to appear and click "Delete scene"
    await page.waitForSelector('.scene__menuItem', { state: 'visible', timeout: 5000 });
    await page.locator('.scene__menuItem').filter({ hasText: 'Delete scene' }).click();

    // Wait for deletion to complete by checking scene count decreased
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(initialCount - 1);
    }).toPass({ timeout: 15000 });
  });

  test('should duplicate a scene', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Wait for the scene list to have the default scene
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 10000 });

    // Count scenes before duplication (should be 1 - the default "First scene")
    const initialCount = await page.locator('.scene__list .scene').count();
    expect(initialCount).toBe(1);

    // Wait for the popover button to be visible and click it
    const scenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').first();
    await expect(scenePopoverBtn).toBeVisible({ timeout: 5000 });
    await scenePopoverBtn.click();

    // Wait for popover menu to appear - retry if needed
    await expect(async () => {
      const menuItem = page.locator('.scene__menuItem').first();
      await expect(menuItem).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    // Click "Duplicate scene"
    await page.locator('.scene__menuItem').filter({ hasText: 'Duplicate scene' }).click();

    // Wait for duplication to complete by checking scene count increased
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(initialCount + 1);
    }).toPass({ timeout: 15000 });
  });
});
