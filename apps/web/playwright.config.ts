import type { PlaywrightTestConfig } from '@playwright/test';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.CF_PAGES_URL || 'http://localhost:5174';
const isVercel = process.env.CF_PAGES_URL && !process.env.CF_PAGES_URL.includes('localhost');

const config: PlaywrightTestConfig = {
  // @ts-expect-error typing
  use: {
    baseURL,
    ...(isVercel && {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      }
    })
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
