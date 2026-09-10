import { db } from '$lib/db/app';
import {
  gameSessionTable,
  partyTable,
  realtimeActivityTable,
  usersTable,
  type InsertRealtimeActivity,
  type RealtimeActivityKind,
  type SelectRealtimeActivity
} from '$lib/db/app/schema';
import { and, eq, gte, inArray, lt, max } from 'drizzle-orm';

// The only writer to realtime_activity. Rows come from three places: PartyKit
// rooms (connect/close via /api/internal/roomActivity), the persist endpoints
// (edit / party_state), and editor pings (editor_active).

export const ACTIVITY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

/** Kinds that mean "someone is doing something" — a sleeping playfield wakes on these. */
export const WAKE_ACTIVITY_KINDS: RealtimeActivityKind[] = ['connect', 'edit', 'party_state', 'editor_active'];

export type RealtimeActivityInput = Pick<InsertRealtimeActivity, 'partyId' | 'kind'> &
  Partial<Pick<InsertRealtimeActivity, 'gameSessionId' | 'userId' | 'connections' | 'createdAt'>>;

export const recordRealtimeActivity = async (input: RealtimeActivityInput | RealtimeActivityInput[]) => {
  const rows = Array.isArray(input) ? input : [input];
  if (rows.length === 0) return;
  await db.insert(realtimeActivityTable).values(rows);
};

export const getGameSessionPartyId = async (gameSessionId: string): Promise<string | null> => {
  const row = await db
    .select({ partyId: gameSessionTable.partyId })
    .from(gameSessionTable)
    .where(eq(gameSessionTable.id, gameSessionId))
    .get();
  return row?.partyId ?? null;
};

export const partyExists = async (partyId: string): Promise<boolean> => {
  const row = await db.select({ id: partyTable.id }).from(partyTable).where(eq(partyTable.id, partyId)).get();
  return !!row;
};

/** Filters a list of client-supplied user ids down to ones that exist, so foreign keys hold. */
export const resolveKnownUserIds = async (userIds: string[]): Promise<Set<string>> => {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Set();
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(inArray(usersTable.id, unique)).all();
  return new Set(rows.map((row) => row.id));
};

export const getLatestPartyActivityAt = async (
  partyId: string,
  kinds?: RealtimeActivityKind[]
): Promise<Date | null> => {
  const row = await db
    .select({ latest: max(realtimeActivityTable.createdAt) })
    .from(realtimeActivityTable)
    .where(
      and(
        eq(realtimeActivityTable.partyId, partyId),
        kinds && kinds.length > 0 ? inArray(realtimeActivityTable.kind, kinds) : undefined
      )
    )
    .get();
  return row?.latest ?? null;
};

export interface PartyLiveState {
  activeSceneId: string | null;
  isPaused: boolean;
  /** Epoch ms of the latest wake-kind activity row, or null if none. */
  lastActivityAt: number | null;
}

/** What a sleeping playfield polls: enough to decide whether to reconnect. */
export const getPartyLiveState = async (partyId: string): Promise<PartyLiveState> => {
  const [party, latest] = await Promise.all([
    db
      .select({ activeSceneId: partyTable.activeSceneId, isPaused: partyTable.gameSessionIsPaused })
      .from(partyTable)
      .where(eq(partyTable.id, partyId))
      .get(),
    getLatestPartyActivityAt(partyId, WAKE_ACTIVITY_KINDS)
  ]);
  return {
    activeSceneId: party?.activeSceneId ?? null,
    isPaused: party?.isPaused ?? false,
    lastActivityAt: latest ? latest.getTime() : null
  };
};

export const listRealtimeActivitySince = async (since: Date): Promise<SelectRealtimeActivity[]> => {
  return db
    .select()
    .from(realtimeActivityTable)
    .where(gte(realtimeActivityTable.createdAt, since))
    .orderBy(realtimeActivityTable.createdAt)
    .all();
};

export const pruneRealtimeActivity = async (olderThan: Date) => {
  await db.delete(realtimeActivityTable).where(lt(realtimeActivityTable.createdAt, olderThan));
};

let lastPruneAt = 0;

/** Retention sweep, at most once an hour per process; never throws. */
export const maybePruneRealtimeActivity = async () => {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  try {
    await pruneRealtimeActivity(new Date(now - ACTIVITY_RETENTION_MS));
  } catch (error) {
    console.warn('realtime activity prune failed', error);
  }
};
