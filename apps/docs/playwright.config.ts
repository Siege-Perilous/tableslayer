import type { PlaywrightTestConfig } from '@playwright/test';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });

const config: PlaywrightTestConfig = {
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8174'
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
