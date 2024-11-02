import { db } from '$lib/db/app';
import { sessionTable, usersTable, type SelectSession, type SelectUser } from '$lib/db/app/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export type SessionValidationResult = { session: SelectSession; user: SelectUser } | { session: null; user: null };

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(token: string, userId: string): Promise<SelectSession> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: SelectSession = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  };
  await db.insert(sessionTable).values(session);
  return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await db
    .select({ user: usersTable, session: sessionTable })
    .from(sessionTable)
    .innerJoin(usersTable, eq(sessionTable.userId, usersTable.id))
    .where(eq(sessionTable.id, sessionId));
  if (result.length < 1) {
    return { session: null, user: null };
  }
  const { user, session } = result[0];
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(sessionTable)
      .set({
        expiresAt: session.expiresAt
      })
      .where(eq(sessionTable.id, session.id));
  }
  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt?: Date): void {
  event.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    expires: expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    path: '/'
  });
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
  event.cookies.set('session', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}
