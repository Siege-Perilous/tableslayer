import { BASE_URL, VERCEL_AUTOMATION_BYPASS_SECRET } from '$env/dynamic/private';
import type { PlaywrightTestConfig } from '@playwright/test';

const baseURL = BASE_URL || 'http://localhost:5173';
const isVercel = BASE_URL && !BASE_URL.includes('localhost');

const config: PlaywrightTestConfig = {
  use: {
    baseURL,
    ...(isVercel && {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': VERCEL_AUTOMATION_BYPASS_SECRET
      }
    })
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
