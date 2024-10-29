import type { PlaywrightTestConfig } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env' });

const config: PlaywrightTestConfig = {
  use: {
    baseURL: process.env.TEST_URL!
  },
  webServer: {
    command: 'pnpm run build && pnpm run preview --port 8173',
    port: 8173,
    reuseExistingServer: true
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
