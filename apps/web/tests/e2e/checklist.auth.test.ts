import { expect, test, type Locator } from '@playwright/test';
import {
  activateMarkerTool,
  clickCanvasCenter,
  createPartyAndSession,
  gotoWithRetry,
  waitForSceneEditor
} from './helpers/test-helpers';

// Helper to extract progress count from text like "5 / 18"
const getProgressCount = async (progress: Locator): Promise<number> => {
  const text = await progress.textContent();
  const match = text?.match(/(\d+)\s*\/\s*\d+/);
  return match ? parseInt(match[1], 10) : 0;
};

test.describe('Checklist feature tour', () => {
  // ThreeJS canvas takes time to load
  test.setTimeout(120000);

  test('should display checklist and allow interaction', async ({ page }) => {
    // Set viewport large enough to show the Learn button
    await page.setViewportSize({ width: 1280, height: 800 });

    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click Learn button to show checklist
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible({ timeout: 10000 });
    await learnButton.click();

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Verify progress indicator is visible and shows format "X / Y"
    const progress = page.getByTestId('checklistProgress');
    await expect(progress).toBeVisible();
    await expect(progress).toContainText('/');

    // Get the initial progress count
    const initialCount = await getProgressCount(progress);

    // Click on the first checklist item to expand it
    const firstItemTitle = page.getByTestId('checklistItemTitle').first();
    await expect(firstItemTitle).toBeVisible();
    await firstItemTitle.click();

    // Verify instructions are shown (item expanded)
    const instructions = page.locator('.checklist__instructions').first();
    await expect(instructions).toBeVisible({ timeout: 5000 });

    // Find an uncompleted checkbox to click
    const checkboxes = page.getByTestId('checklistItemCheckbox');
    const count = await checkboxes.count();

    // Find first uncompleted item (no svg icon inside)
    let clickedCheckbox = false;
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      const hasIcon = await checkbox.locator('svg').count();
      if (hasIcon === 0) {
        await checkbox.click();
        clickedCheckbox = true;

        // Verify the item now shows as completed (checkbox has check icon)
        const checkIcon = checkbox.locator('svg');
        await expect(checkIcon).toBeVisible({ timeout: 5000 });
        break;
      }
    }

    // If we clicked an uncompleted checkbox, verify progress increased
    if (clickedCheckbox) {
      const newCount = await getProgressCount(progress);
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should dismiss checklist and reopen via Learn button', async ({ page }) => {
    // Set viewport large enough to show the Learn button
    await page.setViewportSize({ width: 1280, height: 800 });

    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click Learn button to show checklist
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible({ timeout: 10000 });
    await learnButton.click();

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Click dismiss button
    const dismissButton = page.getByTestId('checklistDismissButton');
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();

    // Verify checklist is hidden
    await expect(checklist).not.toBeVisible({ timeout: 5000 });

    // Wait a moment for any state updates
    await page.waitForTimeout(500);

    // Click Learn button to reopen (use force since it may be hidden on small viewports)
    await learnButton.click({ force: true });

    // Verify checklist is visible again
    await expect(checklist).toBeVisible({ timeout: 5000 });
  });

  test('should auto-complete checklist item when placing a marker', async ({ page }) => {
    // Set viewport large enough to show the Learn button
    await page.setViewportSize({ width: 1280, height: 800 });

    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click Learn button to show checklist
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible({ timeout: 10000 });
    await learnButton.click();

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Activate marker tool and place a marker
    await activateMarkerTool(page);
    await clickCanvasCenter(page);

    // Wait for marker to be created
    await page.waitForTimeout(1000);

    // Click Learn button to show checklist again (use force since it may be hidden)
    await learnButton.click({ force: true });

    // Verify checklist is visible
    await expect(checklist).toBeVisible({ timeout: 5000 });

    // The place-marker item should now be completed
    // Check that the item with id 'place-marker' shows as completed
    const placeMarkerItem = page.locator('[data-item-id="place-marker"]');
    const placeMarkerCheckbox = placeMarkerItem.getByTestId('checklistItemCheckbox');
    const checkIcon = placeMarkerCheckbox.locator('svg');
    await expect(checkIcon).toBeVisible({ timeout: 5000 });
  });

  test('should auto-complete checklist item when using measurement tool', async ({ page }) => {
    // Set viewport large enough to show the Learn button
    await page.setViewportSize({ width: 1280, height: 800 });

    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click Learn button to show checklist
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible({ timeout: 10000 });
    await learnButton.click();

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Get initial progress count
    const progress = page.getByTestId('checklistProgress');
    await expect(progress).toBeVisible();

    // Press 'T' to activate measurement tool
    await page.keyboard.press('t');

    // Wait for tool activation and checklist update
    await page.waitForTimeout(500);

    // The measurement item should now be completed
    const measurementItem = page.locator('[data-item-id="measurement"]');
    const measurementCheckbox = measurementItem.getByTestId('checklistItemCheckbox');
    const checkIcon = measurementCheckbox.locator('svg');
    await expect(checkIcon).toBeVisible({ timeout: 5000 });
  });

  test('should persist checklist completion across page reload', async ({ page }) => {
    // Set viewport large enough to show the Learn button
    await page.setViewportSize({ width: 1280, height: 800 });

    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click Learn button to show checklist
    const learnButton = page.getByTestId('checklistHelpButton');
    await expect(learnButton).toBeVisible({ timeout: 10000 });
    await learnButton.click();

    // Verify checklist is visible
    const checklist = page.getByTestId('checklist');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Get current progress count
    const progress = page.getByTestId('checklistProgress');
    const initialCount = await getProgressCount(progress);

    // Find and click an uncompleted checkbox
    const checkboxes = page.getByTestId('checklistItemCheckbox');
    const count = await checkboxes.count();
    let clickedItemIndex = -1;

    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      const hasIcon = await checkbox.locator('svg').count();
      if (hasIcon === 0) {
        await checkbox.click();
        clickedItemIndex = i;
        break;
      }
    }

    // If we clicked a checkbox, verify the progress increased
    if (clickedItemIndex >= 0) {
      const newCount = await getProgressCount(progress);
      expect(newCount).toBeGreaterThan(initialCount);

      // Wait for the mutation to persist
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();
      await waitForSceneEditor(page);

      // Click Learn button to show checklist (use force since it may be hidden)
      await learnButton.click({ force: true });

      // Verify checklist is visible
      await expect(checklist).toBeVisible({ timeout: 10000 });

      // Verify completion persisted - count should be at least what it was after clicking
      const persistedCount = await getProgressCount(progress);
      expect(persistedCount).toBeGreaterThanOrEqual(newCount);

      // Verify the item we clicked still shows as completed
      const clickedCheckbox = checkboxes.nth(clickedItemIndex);
      const checkIcon = clickedCheckbox.locator('svg');
      await expect(checkIcon).toBeVisible({ timeout: 5000 });
    }
  });
});
