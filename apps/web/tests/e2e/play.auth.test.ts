import { expect, test } from '@playwright/test';
import path from 'path';
import { createPartyAndSession, uploadSceneFile, waitForPlayfield, waitForSceneEditor } from './helpers/test-helpers';

const testImagePath = path.join(process.cwd(), 'tests/e2e/fixtures/test-image.png');

test.describe('Playfield operations', () => {
  // ThreeJS canvas takes 15-20s to load on CI runners, plus we need to load both editor and playfield
  test.setTimeout(180000);

  test('should load playfield and update when active scene is changed from editor', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // --- STEP 1: Navigate to editor and wait for it to load ---
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Verify we have the default scene
    await expect(page.locator('.scene__list .scene')).toHaveCount(1, { timeout: 10000 });

    // --- STEP 2: Navigate to playfield and verify it loads with default active scene ---
    await page.goto(`/${partySlug}/play`);
    await waitForPlayfield(page);

    // The playfield should show the stage with the default active scene
    await expect(page.getByTestId('playfieldStage')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });

    // The waiting message should not be visible since there's an active scene
    await expect(page.getByTestId('playfieldWaitingMessage')).not.toBeVisible();

    // --- STEP 3: Go back to editor and upload a second scene ---
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    const initialSceneCount = await page.locator('.scene__list .scene').count();
    await uploadSceneFile(page, testImagePath);

    // Wait for the scene creation to complete
    await expect(async () => {
      const count = await page.locator('.scene__list .scene').count();
      expect(count).toBe(initialSceneCount + 1);
    }).toPass({ timeout: 20000 });

    // --- STEP 4: Set the second scene as active via context menu ---
    const secondScenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').nth(1);
    await expect(secondScenePopoverBtn).toBeVisible({ timeout: 10000 });
    await secondScenePopoverBtn.click({ force: true });

    // Click "Set active scene"
    const setActiveMenuItem = page.locator('.scene__menuItem').filter({ hasText: 'Set active scene' });
    await expect(setActiveMenuItem).toBeVisible({ timeout: 5000 });
    await setActiveMenuItem.click({ force: true });

    // Wait for the active scene indicator to appear on the second scene
    const secondScene = page.locator('.scene__list .scene').nth(1);
    await expect(secondScene.locator('.scene__projectedIcon')).toBeVisible({ timeout: 10000 });
    await expect(secondScene.locator('.scene__projectedIcon')).toContainText('Active on table', { timeout: 5000 });

    // --- STEP 5: Navigate to playfield and verify it shows the new active scene ---
    await page.goto(`/${partySlug}/play`);
    await waitForPlayfield(page);

    // Playfield should show the stage with the second scene
    await expect(page.getByTestId('playfieldStage')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });

    // --- STEP 6: Go back to editor and switch back to the first scene ---
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    const firstScenePopoverBtn = page.locator('.scene__list .scene__popoverBtn').first();
    await expect(firstScenePopoverBtn).toBeVisible({ timeout: 10000 });
    await firstScenePopoverBtn.click({ force: true });

    const setActiveMenuItem2 = page.locator('.scene__menuItem').filter({ hasText: 'Set active scene' });
    await expect(setActiveMenuItem2).toBeVisible({ timeout: 5000 });
    await setActiveMenuItem2.click({ force: true });

    // Wait for the active indicator to move to the first scene
    const firstScene = page.locator('.scene__list .scene').first();
    await expect(firstScene.locator('.scene__projectedIcon')).toBeVisible({ timeout: 10000 });

    // --- STEP 7: Verify playfield still works after switching active scene back ---
    await page.goto(`/${partySlug}/play`);
    await waitForPlayfield(page);

    // Playfield should still show the stage with the first scene now active
    await expect(page.getByTestId('playfieldStage')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
  });
});
