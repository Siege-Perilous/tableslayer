import { expect, test } from '@playwright/test';
import {
  activateMarkerTool,
  clickCanvasCenter,
  createPartyAndSession,
  gotoWithRetry,
  waitForSceneEditor
} from './helpers/test-helpers';

test.describe('Checklist feature tour', () => {
  // ThreeJS canvas takes time to load
  test.setTimeout(120000);

  test('should display checklist for new users and allow interaction', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Verify checklist is visible (auto-shows for new users)
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Verify progress indicator shows initial state
    const progress = page.getByTestId('checklistProgress');
    await expect(progress).toBeVisible();
    await expect(progress).toContainText('0 /');

    // Click on the first checklist item to expand it
    const firstItemTitle = page.getByTestId('checklistItemTitle').first();
    await expect(firstItemTitle).toBeVisible();
    await firstItemTitle.click();

    // Verify instructions are shown (item expanded)
    const instructions = page.locator('.checklist__instructions').first();
    await expect(instructions).toBeVisible({ timeout: 5000 });

    // Click the checkbox to mark item as complete
    const firstItemCheckbox = page.getByTestId('checklistItemCheckbox').first();
    await expect(firstItemCheckbox).toBeVisible();
    await firstItemCheckbox.click();

    // Verify progress updated
    await expect(progress).toContainText('1 /');

    // Verify the item shows as completed (checkbox has check icon)
    const checkIcon = firstItemCheckbox.locator('svg');
    await expect(checkIcon).toBeVisible({ timeout: 5000 });
  });

  test('should dismiss checklist and reopen via Learn button', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Click dismiss button
    const dismissButton = page.getByTestId('checklistDismissButton');
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();

    // Verify checklist is hidden
    await expect(checklist).not.toBeVisible({ timeout: 5000 });

    // Click Learn button to reopen
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible();
    await learnButton.click();

    // Verify checklist is visible again
    await expect(checklist).toBeVisible({ timeout: 5000 });
  });

  test('should auto-complete checklist item when placing a marker', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Verify checklist is visible and place-marker is not completed
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    const placeMarkerItem = page
      .getByTestId('checklistItem')
      .filter({ has: page.locator('[data-item-id="place-marker"]') });
    const placeMarkerCheckbox = placeMarkerItem.getByTestId('checklistItemCheckbox');

    // Verify item is not completed initially (no check icon)
    await expect(placeMarkerCheckbox.locator('svg')).not.toBeVisible();

    // Activate marker tool and place a marker
    await activateMarkerTool(page);
    await clickCanvasCenter(page);

    // Wait for marker to be created
    await page.waitForTimeout(1000);

    // Click Learn button to show checklist again (marker panel may have taken over)
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible();
    await learnButton.click();

    // Verify checklist is visible
    await expect(checklist).toBeVisible({ timeout: 5000 });

    // Verify the place-marker item is now completed
    const progress = page.getByTestId('checklistProgress');
    await expect(progress).toContainText('1 /');
  });

  test('should auto-complete checklist item when using measurement tool', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Press 'T' to activate measurement tool
    await page.keyboard.press('t');

    // Wait for tool activation
    await page.waitForTimeout(500);

    // Verify the measurement item is now completed
    const progress = page.getByTestId('checklistProgress');
    await expect(progress).toContainText('1 /');
  });

  test('should persist checklist completion across page reload', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Wait for checklist to be visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Mark first item as complete
    const firstItemCheckbox = page.getByTestId('checklistItemCheckbox').first();
    await expect(firstItemCheckbox).toBeVisible();
    await firstItemCheckbox.click();

    // Verify progress shows 1 completed
    const progress = page.getByTestId('checklistProgress');
    await expect(progress).toContainText('1 /');

    // Wait for the mutation to persist
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();
    await waitForSceneEditor(page);

    // Click Learn button to show checklist (may not auto-show after reload depending on state)
    const learnButton = page.getByTestId('checklistHelpButton');
    if (await learnButton.isVisible()) {
      await learnButton.click();
    }

    // Verify checklist is visible
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Verify completion persisted
    await expect(progress).toContainText('1 /');

    // Verify the first item still shows as completed
    const checkIcon = firstItemCheckbox.locator('svg');
    await expect(checkIcon).toBeVisible({ timeout: 5000 });
  });
});
