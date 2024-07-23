import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
  schema: './src/lib/db/app',
  out: './migrations/app',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_APP_DB_URL!,
    authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
  }
});
