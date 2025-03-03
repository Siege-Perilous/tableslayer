// apps/web/src/lib/db/app/index.ts
import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';

config({ path: '.env' });

const isProduction = process.env.ENV_NAME === 'production';
const dbPath = '/app/data/turso_local.db';
let client;
let databaseMode = 'unknown';

if (isProduction) {
  try {
    // Check if the directory exists first
    if (!fs.existsSync('/app/data')) {
      fs.mkdirSync('/app/data', { recursive: true });
      console.log('Created /app/data directory');
    }

    // Try to use local file with sync
    client = createClient({
      url: `file:${dbPath}`,
      syncUrl: process.env.TURSO_APP_DB_URL!,
      syncInterval: 30,
      authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
    });
    databaseMode = 'local-with-sync';
    console.log('🔄 DATABASE MODE: Using local database replica with sync');
  } catch (error) {
    console.warn('⚠️ Could not initialize local DB replica, falling back to remote only:', error);
    // Fallback to remote-only if local file isn't available
    client = createClient({
      url: process.env.TURSO_APP_DB_URL!,
      authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
    });
    databaseMode = 'remote-only-fallback';
    console.log('☁️ DATABASE MODE: Using remote database (fallback)');
  }
} else {
  // Development environment - use remote
  client = createClient({
    url: process.env.TURSO_APP_DB_URL!,
    authToken: process.env.TURSO_APP_DB_AUTH_TOKEN!
  });
  databaseMode = 'remote-dev';
  console.log('🧪 DATABASE MODE: Using remote database (development)');
}

// Create a simple endpoint to check the database mode
export const getDatabaseMode = () => databaseMode;

export const db = drizzle(client);
