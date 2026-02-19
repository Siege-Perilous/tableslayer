import { expect, test } from '@playwright/test';

// Helper to create a party and game session, returns the URL to the editor
async function createPartyAndSession(
  page: import('@playwright/test').Page
): Promise<{ partySlug: string; sessionSlug: string }> {
  const partyName = `Marker Test ${Date.now()}`;

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
  // Wait for the scenes container and stage to be visible
  await page.waitForSelector('.scenes', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('canvas', { state: 'visible', timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Allow time for ThreeJS to initialize
}

test.describe('Marker CRUD operations', () => {
  test('should create a marker by clicking on the canvas', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click the "Marker" button in the toolbar to activate marker mode
    // This directly puts us in marker mode with "Left-click an empty space to add a new marker"
    const markerToolbarBtn = page.locator('.sceneControls button:has-text("Marker")');
    await markerToolbarBtn.click();

    // Wait for marker mode hint to be visible
    await expect(page.locator('text=Left-click an empty space to add a new marker')).toBeVisible({ timeout: 10000 });

    // Click on the canvas to create a marker
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    // Click in the center of the canvas
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);

    // Wait for marker to be created and appear in the edit view
    await expect(page.locator('.markerManager__editView')).toBeVisible({ timeout: 10000 });
  });

  test('should edit a marker label', async ({ page }) => {
    const { partySlug, sessionSlug } = await createPartyAndSession(page);

    // Navigate to the game session editor
    await page.goto(`/${partySlug}/${sessionSlug}`);
    await waitForSceneEditor(page);

    // Click the "Marker" button in the toolbar to activate marker mode
    const markerToolbarBtn = page.locator('.sceneControls button:has-text("Marker")');
    await markerToolbarBtn.click();
    await expect(page.locator('text=Left-click an empty space to add a new marker')).toBeVisible({ timeout: 10000 });

    // Click on canvas to create a marker
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);

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

    // Click the "Marker" button in the toolbar to activate marker mode
    const markerToolbarBtn = page.locator('.sceneControls button:has-text("Marker")');
    await markerToolbarBtn.click();
    await expect(page.locator('text=Left-click an empty space to add a new marker')).toBeVisible({ timeout: 10000 });

    // Click on canvas to create a marker
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);

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

    // Click the "Marker" button in the toolbar to open marker panel
    const markerToolbarBtn = page.locator('.sceneControls button:has-text("Marker")');
    await markerToolbarBtn.click();

    // Verify the "No markers" message is visible
    await expect(page.locator('text=No markers in this scene')).toBeVisible({ timeout: 10000 });

    // Verify helpful text is displayed
    await expect(page.locator('text=Markers allow you to mark important locations')).toBeVisible();
  });
});
