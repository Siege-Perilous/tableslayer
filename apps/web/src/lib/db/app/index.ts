import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';

config({ path: '.env' });

/* const client = createClient({
  url: 'file:src/lib/db/app/local.db',
  syncUrl: process.env.TURSO_APP_DB_URL!,
  syncInterval: 30,
  authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
}); */

const client = createClient({
  url: process.env.TURSO_APP_DB_URL!,
  authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
});

export const db = drizzle(client);
