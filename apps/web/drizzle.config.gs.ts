import { TURSO_GS_PARENT_DB_AUTH_TOKEN, TURSO_GS_PARENT_DB_URL } from '$env/static/private';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/gs',
  out: './migrations/app/gs',
  dialect: 'turso',
  dbCredentials: {
    url: TURSO_GS_PARENT_DB_URL!,
    authToken: TURSO_GS_PARENT_DB_AUTH_TOKEN!
  }
});
