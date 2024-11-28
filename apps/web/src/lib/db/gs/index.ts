import { TURSO_GS_PARENT_DB_AUTH_TOKEN, TURSO_GS_PARENT_DB_URL } from '$env/static/private';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({
  url: TURSO_GS_PARENT_DB_URL,
  authToken: TURSO_GS_PARENT_DB_AUTH_TOKEN
});

export const gsDb = drizzle(client);
