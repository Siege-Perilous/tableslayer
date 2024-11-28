import { TURSO_APP_DB_AUTH_TOKEN, TURSO_APP_DB_URL } from '$env/static/private';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/app',
  out: './migrations/app',
  dialect: 'turso',
  dbCredentials: {
    url: TURSO_APP_DB_URL,
    authToken: TURSO_APP_DB_AUTH_TOKEN
  }
});
