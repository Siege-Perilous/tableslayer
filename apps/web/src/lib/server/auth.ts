import { dev } from '$app/environment';
import { db } from '$lib/db';
import { sessionTable, usersTable } from '$lib/db/schema';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { Lucia } from 'lucia';

const adapter = new DrizzleSQLiteAdapter(db, sessionTable, usersTable);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // set to `true` when using HTTPS
      secure: !dev
    }
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
  }
}
