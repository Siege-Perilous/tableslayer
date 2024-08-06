import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';

config({ path: '.env' });

const client = createClient({
  url: process.env.TURSO_GS_PARENT_DB_URL!,
  authToken: process.env.TURSO_GS_PARENT_DB_AUTH_TOKEN!
});

export const gsDb = drizzle(client);
