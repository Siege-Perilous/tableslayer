import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';

config({ path: '.env' });

const client = createClient({
  url: process.env.TURSO_APP_DB_URL!,
  authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
});

export const appDb = drizzle(client);

export * from './schema';
