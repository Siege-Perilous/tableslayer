import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
  schema: './src/lib/db/gs/schema.ts',
  out: './src/lib/db/gs/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_GS_PARENT_DB_URL!,
    authToken: process.env.TURSO_GS_PARENT_DB_AUTH_TOKEN!
  }
});
