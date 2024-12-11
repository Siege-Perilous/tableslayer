import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';

config({ path: '.env' });

const client = createClient({
  url: process.env.TURSO_GS_PARENT_DB_URL!,
  authToken: process.env.TURSO_GS_PARENT_DB_AUTH_TOKEN!
});

export const gsDb = drizzle(client);

export const gsChildDb = (dbName: string) => {
  const client = createClient({
    url: `libsql://${dbName}-snide.turso.io`,
    authToken: process.env.TURSO_GS_PARENT_DB_AUTH_TOKEN!
  });

  if (!client) {
    throw new Error('Error creating client');
  }

  const gsChildDb = drizzle(client);

  return gsChildDb;
};
