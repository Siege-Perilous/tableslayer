import { expect, test } from '@playwright/test';
import path from 'path';
import { createPartyAndSession, uploadSceneFile, waitForSceneEditor } from './helpers/test-helpers';

// Use process.cwd() which is apps/web when Playwright runs
const testImagePath = path.join(process.cwd(), 'tests/e2e/fixtures/test-image.png');

test.describe('Scene CRUD operations', () => {
  test('should create a scene by uploading an image', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Count initial scenes (new sessions may start with a default "First scene")
    const initialSceneCount = await page.locator('.scene__list .scene').count();

    // Upload a file to create a new scene
    await uploadSceneFile(page, testImagePath);

    // Wait for the scene creation to complete by checking the scene count increases
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(initialSceneCount + 1);
    }).toPass({ timeout: 20000 });

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
    // Use force:true to bypass any overlays that might block clicks
    await scene.click({ button: 'right', force: true });

    // Wait for popover menu to appear and click "Rename scene"
    const renameMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Rename scene' });
    await expect(renameMenuItem).toBeVisible({ timeout: 5000 });
    await renameMenuItem.click();

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
    await uploadSceneFile(page, testImagePath);

    // Wait for second scene to appear
    await expect(page.locator('.scene__list .scene')).toHaveCount(2, { timeout: 20000 });

    // Wait for upload to fully complete (button re-enabled)
    // Use longer timeout as file uploads can be slow in CI
    const addSceneBtn = page.locator('.scene__inputBtn');
    await expect(addSceneBtn).not.toBeDisabled({ timeout: 30000 });

    // Open scene menu via the chevron button on the FIRST scene (index 0)
    // Delete the first scene since deleting the newly added one might have issues
    const scenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').first();
    await expect(scenePopoverBtn).toBeVisible({ timeout: 5000 });
    // Use force:true to bypass any overlays that might block clicks
    await scenePopoverBtn.click({ force: true });

    // Wait for popover menu to appear and click "Delete scene"
    const deleteMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Delete scene' });
    await expect(deleteMenuItem).toBeVisible({ timeout: 5000 });
    await deleteMenuItem.click();

    // Wait for popover to close and deletion to complete
    await expect(deleteMenuItem).not.toBeVisible({ timeout: 5000 });

    // Wait for deletion to complete by checking scene count decreased
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 20000 });
  });

  test('should duplicate a scene', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Wait for the scene list to have the default scene
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 10000 });

    // Wait for add scene button to not be disabled (no operations in progress)
    const addSceneBtn = page.locator('.scene__inputBtn');
    await expect(addSceneBtn).not.toBeDisabled({ timeout: 10000 });

    // Wait for the popover button to be visible and click it
    const scenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').first();
    await expect(scenePopoverBtn).toBeVisible({ timeout: 5000 });
    // Use force:true to bypass any overlays that might block clicks
    await scenePopoverBtn.click({ force: true });

    // Wait for popover menu to appear
    const duplicateMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Duplicate scene' });
    await expect(duplicateMenuItem).toBeVisible({ timeout: 5000 });
    await duplicateMenuItem.click();

    // Wait for popover to close
    await expect(duplicateMenuItem).not.toBeVisible({ timeout: 5000 });

    // Wait for duplication to complete by checking scene count increased
    await expect(page.locator('.scene__list .scene')).toHaveCount(2, { timeout: 25000 });
  });
});
