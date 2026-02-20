import { expect, test } from '@playwright/test';

/**
 * Diagnostic test to verify GPU/WebGL status in CI.
 *
 * This test outputs WebGL renderer info to help debug GPU acceleration issues.
 * Look for these indicators in the test output:
 *
 *   ✅ "NVIDIA Tesla T4" = Hardware GPU working (fastest, ~1.4min total)
 *   ⚠️  "llvmpipe" = Mesa software rendering (fast, ~1.6min total)
 *   ❌ "SwiftShader" = Chromium software rendering (slow, ~5min total)
 *
 * See docs/playwright-testing-guide.md for GPU setup documentation.
 */
test.describe('GPU diagnostics', () => {
  test('should report WebGL renderer info', async ({ page }) => {
    // Navigate to a real page (the app's homepage)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check WebGL info via JavaScript
    const webglInfo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');

      // Try WebGL2 first, then WebGL1
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
        maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        webglVersion: gl instanceof WebGL2RenderingContext ? 2 : 1
      };
    });

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    WebGL GPU DIAGNOSTICS                     ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(
      `║ Renderer: ${String(webglInfo.renderer || 'N/A')
        .slice(0, 50)
        .padEnd(50)} ║`
    );
    console.log(
      `║ Vendor:   ${String(webglInfo.vendor || 'N/A')
        .slice(0, 50)
        .padEnd(50)} ║`
    );
    console.log(
      `║ Version:  ${String(webglInfo.version || 'N/A')
        .slice(0, 50)
        .padEnd(50)} ║`
    );
    console.log('╠══════════════════════════════════════════════════════════════╣');

    // Detect rendering type
    const renderer = String(webglInfo.renderer || '').toLowerCase();
    const isSoftwareRendering =
      renderer.includes('swiftshader') || renderer.includes('llvmpipe') || renderer.includes('software');
    const isNvidiaGpu =
      renderer.includes('nvidia') ||
      renderer.includes('tesla') ||
      renderer.includes('geforce') ||
      renderer.includes('quadro');
    const isAngle = renderer.includes('angle');
    const isVulkan = renderer.includes('vulkan');

    const gpuStatus = isNvidiaGpu
      ? '✅ NVIDIA GPU DETECTED'
      : isSoftwareRendering
        ? '❌ SOFTWARE RENDERING'
        : '⚠️  UNKNOWN GPU';

    console.log(`║ Status:   ${gpuStatus.padEnd(50)} ║`);
    console.log(`║ ANGLE:    ${(isAngle ? 'Yes' : 'No').padEnd(50)} ║`);
    console.log(`║ Vulkan:   ${(isVulkan ? 'Yes' : 'No').padEnd(50)} ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // Log full details
    console.log('Full WebGL Info:', JSON.stringify(webglInfo, null, 2));

    // This test is informational - don't fail, just report
    expect(webglInfo.renderer).toBeDefined();
  });
});
