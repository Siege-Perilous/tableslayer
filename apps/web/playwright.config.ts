import type { PlaywrightTestConfig } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.BASE_URL || 'http://localhost:5174';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GPU flags for hardware-accelerated WebGL rendering in headless Chromium on Linux
// See: https://michelkraemer.com/enable-gpu-for-slow-playwright-tests-in-headless-mode/
const gpuArgs = process.env.CI
  ? [
      '--use-gl=egl',
      '--use-angle=vulkan',
      '--enable-features=Vulkan',
      '--disable-vulkan-surface',
      '--enable-unsafe-webgpu'
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
