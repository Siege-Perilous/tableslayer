import { expect, test } from '@playwright/test';
import { clickCanvasCenter, createPartyAndSession, gotoWithRetry, waitForSceneEditor } from './helpers/test-helpers';

test.describe('Marker CRUD operations', () => {
  // ThreeJS canvas takes 30-45s to load on CI GPU runners
  test.setTimeout(240000);

  test('should perform full marker workflow: verify empty state, create, edit, delete, verify empty again', async ({
    page
  }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await gotoWithRetry(page, `/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // --- STEP 1: Verify empty state initially ---
    const markerToolBtn = page.getByTestId('markerToolButton');
    await expect(markerToolBtn).toBeVisible({ timeout: 10000 });
    await markerToolBtn.click({ force: true });

    // Verify the "No markers" message is visible
    await expect(page.locator('text=No markers in this scene')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Markers allow you to mark important locations')).toBeVisible();

    // --- STEP 2: Create a marker by clicking on the canvas ---
    await clickCanvasCenter(page);

    // Wait for marker to be created and appear in the edit view
    await expect(page.locator('.markerManager__editView')).toBeVisible({ timeout: 10000 });

    // --- STEP 3: Edit the marker label ---
    const labelInput = page.getByRole('textbox', { name: 'ABC' });
    await expect(labelInput).toBeVisible({ timeout: 5000 });

    const newLabel = 'ZZ';
    await labelInput.clear();
    await labelInput.fill(newLabel);

    // Press Tab to blur the input and trigger save
    await labelInput.press('Tab');

    // Verify the label was updated by checking the marker preview shows the new label
    const markerPreview = page.locator('.markerManager__imagePreviewLabel');
    await expect(markerPreview).toContainText(newLabel, { timeout: 5000 });

    // --- STEP 4: Go back to list view ---
    const backLink = page.locator('.markerManager__backButton');
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await backLink.click({ force: true });

    // Wait for list view to appear (marker list with at least one item)
    await expect(page.locator('.markerManager__listItem')).toBeVisible({ timeout: 10000 });

    // --- STEP 5: Delete the marker ---
    // Make the trash icon visible by forcing opacity
    await page.evaluate(() => {
      const editIcon = document.querySelector('.markerManager__editIcon');
      if (editIcon) {
        (editIcon as HTMLElement).style.opacity = '1';
      }
    });
    await page.waitForTimeout(100);

    // Click the trash icon to delete
    const trashBtn = page.locator('.markerManager__editIcon .iconBtn');
    await expect(trashBtn).toBeVisible({ timeout: 5000 });
    await trashBtn.click({ force: true });

    // Confirm deletion
    await page.getByTestId('confirmActionButton').click({ force: true });

    // --- STEP 6: Verify we're back to empty state ---
    await expect(page.locator('text=No markers in this scene')).toBeVisible({ timeout: 10000 });
  });
});
