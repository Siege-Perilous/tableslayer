import { expect, test } from '@playwright/test';
import {
  activateMarkerTool,
  clickCanvasCenter,
  createPartyAndSession,
  waitForSceneEditor
} from './helpers/test-helpers';

test.describe('Marker CRUD operations', () => {
  test('should create a marker by clicking on the canvas', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Activate marker tool
    await activateMarkerTool(page);

    // Click on the canvas to create a marker
    await clickCanvasCenter(page);

    // Wait for marker to be created and appear in the edit view
    await expect(page.locator('.markerManager__editView')).toBeVisible({ timeout: 10000 });
  });

  test('should edit a marker label', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Activate marker tool
    await activateMarkerTool(page);

    // Click on canvas to create a marker
    await clickCanvasCenter(page);

    // Wait for marker edit view to appear
    await expect(page.locator('.markerManager__editView')).toBeVisible({ timeout: 10000 });

    // Find the label input using the placeholder text "ABC"
    const labelInput = page.getByRole('textbox', { name: 'ABC' });
    await expect(labelInput).toBeVisible({ timeout: 5000 });

    const newLabel = 'ZZ';
    await labelInput.clear();
    await labelInput.fill(newLabel);

    // Click somewhere else to trigger save (blur the input)
    await page.locator('.markerManager__header').click();
    await page.waitForTimeout(500);

    // Verify the label was updated by checking the marker preview shows the new label
    const markerPreview = page.locator('.markerManager__imagePreviewLabel');
    await expect(markerPreview).toContainText(newLabel, { timeout: 5000 });
  });

  test('should delete a marker from list view', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Activate marker tool
    await activateMarkerTool(page);

    // Click on canvas to create a marker
    await clickCanvasCenter(page);

    // Wait for marker edit view to appear
    await expect(page.locator('.markerManager__editView')).toBeVisible({ timeout: 10000 });

    // Go back to list view by clicking the link
    const backLink = page.locator('.markerManager__backButton');
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await backLink.click();

    // Wait for list view to appear (marker list with at least one item)
    await expect(page.locator('.markerManager__listItem')).toBeVisible({ timeout: 10000 });

    // Make the trash icon visible by forcing opacity
    await page.evaluate(() => {
      const editIcon = document.querySelector('.markerManager__editIcon');
      if (editIcon) {
        (editIcon as HTMLElement).style.opacity = '1';
      }
    });
    await page.waitForTimeout(100);

    // Click the trash icon to delete (the IconButton has class iconBtn)
    const trashBtn = page.locator('.markerManager__editIcon .iconBtn');
    await expect(trashBtn).toBeVisible({ timeout: 5000 });
    await trashBtn.click();

    // Confirm deletion
    await page.getByTestId('confirmActionButton').click();

    // Verify we're back to showing "No markers in this scene"
    await expect(page.locator('text=No markers in this scene')).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when marker panel has no markers', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click the marker tool button to open marker panel
    const markerToolBtn = page.getByTestId('markerToolButton');
    await expect(markerToolBtn).toBeVisible({ timeout: 10000 });
    // Use force:true to bypass tooltip overlay that can block clicks
    await markerToolBtn.click({ force: true });

    // Verify the "No markers" message is visible
    await expect(page.locator('text=No markers in this scene')).toBeVisible({ timeout: 10000 });

    // Verify helpful text is displayed
    await expect(page.locator('text=Markers allow you to mark important locations')).toBeVisible();
  });
});
