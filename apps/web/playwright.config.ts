import type { PlaywrightTestConfig } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.BASE_URL || 'http://localhost:5174';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: PlaywrightTestConfig = {
  globalSetup: './tests/e2e/global.setup.ts',
  testDir: 'tests/e2e',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  reporter: [['list'], ['json', { outputFile: 'tests/e2e/test-results.json' }]],
  timeout: 90000,
  expect: {
    timeout: 15000
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000
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
