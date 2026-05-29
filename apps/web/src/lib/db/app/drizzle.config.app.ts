import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Try multiple paths for .env (handles both local dev and Docker build contexts)
config({ path: 'apps/web/.env' });
config({ path: '.env' });

export default defineConfig({
  schema: './src/lib/db/app/schema.ts',
  out: './src/lib/db/app/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_APP_DB_URL!,
    authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
  }
});
