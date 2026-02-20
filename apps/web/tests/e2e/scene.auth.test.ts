import { expect, test } from '@playwright/test';
import path from 'path';
import { createPartyAndSession, uploadSceneFile, waitForSceneEditor } from './helpers/test-helpers';

// Use process.cwd() which is apps/web when Playwright runs
const testImagePath = path.join(process.cwd(), 'tests/e2e/fixtures/test-image.png');

test.describe('Scene CRUD operations', () => {
  // ThreeJS canvas takes 15-20s to load on CI runners, plus image uploads can be slow
  test.setTimeout(150000);

  test('should perform full scene workflow: create, rename, duplicate, set active, and delete', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // --- STEP 1: Verify initial state (default "First scene" exists) ---
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 10000 });
    const addSceneBtn = page.locator('.scene__inputBtn');
    await expect(addSceneBtn).not.toBeDisabled({ timeout: 10000 });

    // --- STEP 2: Create a new scene by uploading an image ---
    const initialSceneCount = await page.locator('.scene__list .scene').count();
    await uploadSceneFile(page, testImagePath);

    // Wait for the scene creation to complete
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(initialSceneCount + 1);
    }).toPass({ timeout: 20000 });

    // Verify the "Add scene" button is enabled (scene creation completed)
    await expect(addSceneBtn).not.toBeDisabled();

    // --- STEP 3: Rename the first scene ---
    const sceneText = page.locator('.scene__list .scene__text').first();
    const originalName = await sceneText.textContent();

    // Open scene popover by right-clicking on the scene
    const firstScene = page.locator('.scene__list .scene').first();
    await firstScene.click({ button: 'right', force: true });

    // Wait for popover menu to appear and click "Rename scene"
    const renameMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Rename scene' });
    await expect(renameMenuItem).toBeVisible({ timeout: 5000 });
    await renameMenuItem.click({ force: true });

    // Fill in new name
    const renameInput = page.locator('.scene__renameInput input');
    await expect(renameInput).toBeVisible();
    const newName = `Renamed ${Date.now()}`;
    await renameInput.fill(newName);

    // Submit rename by clicking the check button
    await page.locator('.scene__renameInput button').first().click({ force: true });

    // Wait for rename to complete
    await expect(sceneText).toContainText(newName, { timeout: 10000 });
    expect(await sceneText.textContent()).not.toEqual(originalName);

    // --- STEP 4: Duplicate the first scene ---
    await expect(addSceneBtn).not.toBeDisabled({ timeout: 10000 });

    const scenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').first();
    await expect(scenePopoverBtn).toBeVisible({ timeout: 5000 });
    await scenePopoverBtn.click({ force: true });

    const duplicateMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Duplicate scene' });
    await expect(duplicateMenuItem).toBeVisible({ timeout: 5000 });
    await duplicateMenuItem.click({ force: true });

    // Wait for popover to close
    await expect(duplicateMenuItem).not.toBeVisible({ timeout: 5000 });

    // Wait for duplication to complete (now we should have 3 scenes)
    await expect(page.locator('.scene__list .scene')).toHaveCount(3, { timeout: 25000 });

    // --- STEP 5: Set a scene as active ---
    // Verify no scene is currently active
    await expect(page.locator('.scene__projectedIcon')).not.toBeVisible();

    // Open scene menu via the popover button
    await expect(scenePopoverBtn).toBeVisible({ timeout: 5000 });
    await scenePopoverBtn.click({ force: true });

    // Click "Set active scene"
    const setActiveMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Set active scene' });
    await expect(setActiveMenuItem).toBeVisible({ timeout: 5000 });
    await setActiveMenuItem.click({ force: true });

    // Wait for the active scene indicator to appear
    await expect(page.locator('.scene__projectedIcon')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.scene__projectedIcon')).toContainText('Active on table', { timeout: 5000 });

    // --- STEP 6: Delete a scene ---
    await expect(addSceneBtn).not.toBeDisabled({ timeout: 15000 });

    // Delete the second scene (not the active one)
    const secondScenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').nth(1);
    await expect(secondScenePopoverBtn).toBeVisible({ timeout: 5000 });
    await secondScenePopoverBtn.click({ force: true });

    const deleteMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Delete scene' });
    await expect(deleteMenuItem).toBeVisible({ timeout: 5000 });
    await deleteMenuItem.click({ force: true });

    // Wait for popover to close and deletion to complete
    await expect(deleteMenuItem).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.scene__list .scene')).toHaveCount(2, { timeout: 20000 });
  });
});
