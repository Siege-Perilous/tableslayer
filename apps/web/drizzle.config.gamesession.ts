import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
  schema: './src/lib/db/game-session',
  out: './migrations/game-session',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_GS_PARENT_DB_URL!,
    authToken: process.env.TURSO_GS_PARENT_DB_AUTH_TOKEN!
  }
});
