import type { PlaywrightTestConfig } from '@playwright/test';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.BASE_URL || 'http://localhost:5173';

const config: PlaywrightTestConfig = {
  use: {
    baseURL
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
