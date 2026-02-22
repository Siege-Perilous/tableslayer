import type { PlaywrightTestConfig } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.BASE_URL || 'http://localhost:5174';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GPU flags for hardware-accelerated WebGL rendering in CI.
// CI uses gpu-linux-4 runner with Tesla T4 GPU + xvfb in headed mode.
// These flags tell Chromium to use Vulkan/ANGLE for GPU rendering.
// Without these, Chromium falls back to SwiftShader (slow software rendering).
// See docs/playwright-testing-guide.md for full GPU setup documentation.
const gpuArgs = process.env.CI
  ? [
      '--ignore-gpu-blocklist', // Allow GPUs that Chrome might otherwise block
      '--use-angle=vulkan', // Use Vulkan backend for ANGLE (GPU abstraction layer)
      '--enable-features=Vulkan', // Enable Vulkan feature flag
      '--use-gl=angle', // Use ANGLE for OpenGL ES (required for WebGL)
      '--enable-gpu-rasterization', // GPU-accelerated rasterization
      '--enable-zero-copy' // Optimize GPU memory transfers
    ]
  : [];

const config: PlaywrightTestConfig = {
  globalSetup: './tests/e2e/global.setup.ts',
  testDir: 'tests/e2e',
  workers: process.env.CI ? 4 : undefined,
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  reporter: [['list'], ['json', { outputFile: 'tests/e2e/test-results.json' }]],
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    launchOptions: {
      args: gpuArgs
    }
  },
  projects: [
    {
      name: 'authenticated',
      testMatch: /.*\.auth\.(test|spec)\.[jt]s/,
      use: {
        storageState: join(__dirname, 'tests/e2e/.auth/user.json')
      }
    },
    {
      name: 'unauthenticated',
      testIgnore: /.*\.auth\.(test|spec)\.[jt]s/
    }
  ]
};

export default config;
