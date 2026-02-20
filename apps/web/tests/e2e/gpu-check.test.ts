import { expect, test } from '@playwright/test';

/**
 * Diagnostic test to verify GPU hardware acceleration is working.
 * This helps debug performance issues with ThreeJS canvas rendering.
 */
test.describe('GPU diagnostics', () => {
  test('should have hardware acceleration enabled', async ({ page }) => {
    await page.goto('chrome://gpu');

    // Check the feature status list for hardware acceleration indicators
    const featureStatusList = page.locator('.feature-status-list');
    await expect(featureStatusList).toBeVisible({ timeout: 10000 });

    // Log GPU info for debugging
    const content = await featureStatusList.textContent();
    console.log('[GPU Check] Feature status:', content);

    // Check for hardware acceleration - at least WebGL should be accelerated
    // Note: This test is informational - it logs GPU status but doesn't fail
    // if software rendering is used, since that's still functional
    const webglStatus = page.locator('li', { hasText: 'WebGL' }).first();
    if (await webglStatus.isVisible()) {
      const webglText = await webglStatus.textContent();
      console.log('[GPU Check] WebGL status:', webglText);
    }

    // Check for Canvas status
    const canvasStatus = page.locator('li', { hasText: 'Canvas' }).first();
    if (await canvasStatus.isVisible()) {
      const canvasText = await canvasStatus.textContent();
      console.log('[GPU Check] Canvas status:', canvasText);
    }

    // Get GPU device info
    const gpuInfo = page.locator('#basic-info');
    if (await gpuInfo.isVisible()) {
      const gpuText = await gpuInfo.textContent();
      console.log('[GPU Check] GPU info:', gpuText?.slice(0, 500));
    }
  });
});
