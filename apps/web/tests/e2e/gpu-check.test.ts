import { expect, test } from '@playwright/test';

/**
 * Diagnostic test to verify GPU/WebGL status.
 * This checks WebGL renderer info from within an actual page context.
 */
test.describe('GPU diagnostics', () => {
  test('should report WebGL renderer info', async ({ page }) => {
    // Navigate to a real page (the app's homepage)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check WebGL info via JavaScript
    const webglInfo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl2') as WebGL2RenderingContext) ||
        (canvas.getContext('webgl') as WebGLRenderingContext);

      if (!gl) {
        return { error: 'WebGL not available' };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';

      return {
        renderer,
        vendor,
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
      };
    });

    console.log('=== WebGL Info ===');
    console.log(JSON.stringify(webglInfo, null, 2));

    // Check if we're using software rendering (SwiftShader/llvmpipe)
    const renderer = String(webglInfo.renderer || '').toLowerCase();
    const isSoftwareRendering =
      renderer.includes('swiftshader') || renderer.includes('llvmpipe') || renderer.includes('software');

    const isNvidiaGpu = renderer.includes('nvidia') || renderer.includes('tesla') || renderer.includes('geforce');

    console.log(`Software rendering: ${isSoftwareRendering}`);
    console.log(`NVIDIA GPU detected: ${isNvidiaGpu}`);

    // This test is informational - log but don't fail
    expect(webglInfo.renderer).toBeDefined();
  });
});
