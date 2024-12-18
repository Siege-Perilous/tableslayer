import type { PlaywrightTestConfig } from '@playwright/test';

import { config as dconfig } from 'dotenv';

dconfig({ path: '.env' });
const baseURL = process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:5173';
const isVercel = process.env.RAILWAY_PUBLIC_DOMAIN && !process.env.RAILWAY_PUBLIC_DOMAIN.includes('localhost');

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
