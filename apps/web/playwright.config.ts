import type { PlaywrightTestConfig } from '@playwright/test';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.BASE_URL || 'http://localhost:5174';

const config: PlaywrightTestConfig = {
  use: {
    baseURL
  },
  testDir: 'tests/e2e',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
