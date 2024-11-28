import { TURSO_APP_DB_AUTH_TOKEN, TURSO_APP_DB_URL } from '$env/static/private';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({
  url: TURSO_APP_DB_URL,
  authToken: TURSO_APP_DB_AUTH_TOKEN
});

export const db = drizzle(client);
