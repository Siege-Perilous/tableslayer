import { db } from '$lib/db/app';
import { gameSessionTable, partyMemberTable, partyTable, usersTable } from '$lib/db/app/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { listRealtimeActivitySince, maybePruneRealtimeActivity } from './activity';
import { ROLLUP_LOOKBACK_MS, findLiveRooms, rollupActivity, type SessionUsage } from './activityRollup';

// Imported by path from the admin usage page only — deliberately NOT re-exported
// from the realtime barrel (see the web-data-patterns skill on Rolldown inlining).

const DAY_MS = 24 * 60 * 60 * 1000;
export const USAGE_WINDOW_DAYS = [1, 7, 30, 90] as const;
export type UsageWindowDays = (typeof USAGE_WINDOW_DAYS)[number];
export const DEFAULT_USAGE_WINDOW_DAYS: UsageWindowDays = 30;

export interface SessionUsageRow extends SessionUsage {
  name: string;
  slug: string | null;
}

export interface PartyUsageRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planStatus: string | null;
  isUpgraded: boolean;
  adminEmails: string[];
  createdAt: number | null;
  sessionCount: number;
  sittings: number;
  activeSeconds: number;
  idleSeconds: number;
  idleShare: number;
  lastActiveAt: number | null;
  partyRoomActiveSeconds: number;
  /** Rooms of this party holding open sockets right now (session rooms and the party room). */
  liveRooms: LiveRoomRow[];
  /**
   * Connected clients. Every client holds one socket in the party room and one in a
   * session room, so the party room's count is the client count; session rooms are
   * the fallback while the party room is (transiently) missing.
   */
  liveClients: number;
  sessions: SessionUsageRow[];
}

export interface UsageSummary {
  roomsTouched: number;
  roomsWithPlay: number;
  sittings: number;
  activeSeconds: number;
  idleShare: number;
  partyRoomActiveSeconds: number;
  liveRooms: number;
}

export interface LiveRoomRow {
  /** Null for the party room. */
  sessionName: string | null;
  connections: number;
  lastEventAt: number;
}

export interface RealtimeUsage {
  windowDays: number;
  generatedAt: number;
  summary: UsageSummary;
  /** Live parties first, then by room hours. */
  parties: PartyUsageRow[];
}

const unique = (ids: Array<string | null | undefined>) => [...new Set(ids.filter((id): id is string => !!id))];

export const getRealtimeUsage = async (windowDays: number): Promise<RealtimeUsage> => {
  const now = Date.now();
  const window = { start: now - windowDays * DAY_MS, end: now };
  const events = await listRealtimeActivitySince(new Date(window.start - ROLLUP_LOOKBACK_MS));
  await maybePruneRealtimeActivity();

  const { sessions, partyRooms } = rollupActivity(events, window, now);
  const liveRooms = findLiveRooms(events, now);

  const partyIds = unique([
    ...sessions.map((s) => s.partyId),
    ...partyRooms.keys(),
    ...liveRooms.map((r) => r.partyId)
  ]);
  const sessionIds = unique([...sessions.map((s) => s.gameSessionId), ...liveRooms.map((r) => r.gameSessionId)]);

  const [partyRows, sessionRows, adminRows] = await Promise.all([
    partyIds.length === 0
      ? []
      : db
          .select({
            id: partyTable.id,
            name: partyTable.name,
            slug: partyTable.slug,
            plan: partyTable.plan,
            planStatus: partyTable.planStatus,
            createdAt: partyTable.createdAt
          })
          .from(partyTable)
          .where(inArray(partyTable.id, partyIds))
          .all(),
    sessionIds.length === 0
      ? []
      : db
          .select({ id: gameSessionTable.id, name: gameSessionTable.name, slug: gameSessionTable.slug })
          .from(gameSessionTable)
          .where(inArray(gameSessionTable.id, sessionIds))
          .all(),
    partyIds.length === 0
      ? []
      : db
          .select({ partyId: partyMemberTable.partyId, email: usersTable.email })
          .from(partyMemberTable)
          .innerJoin(usersTable, eq(partyMemberTable.userId, usersTable.id))
          .where(and(inArray(partyMemberTable.partyId, partyIds), eq(partyMemberTable.role, 'admin')))
          .all()
  ]);

  const partiesById = new Map(partyRows.map((row) => [row.id, row]));
  const sessionsById = new Map(sessionRows.map((row) => [row.id, row]));
  const adminsByParty = new Map<string, string[]>();
  for (const row of adminRows) {
    const list = adminsByParty.get(row.partyId) ?? [];
    list.push(row.email);
    adminsByParty.set(row.partyId, list);
  }

  const sessionsByParty = new Map<string, SessionUsageRow[]>();
  for (const session of sessions) {
    const meta = sessionsById.get(session.gameSessionId);
    const list = sessionsByParty.get(session.partyId) ?? [];
    list.push({ ...session, name: meta?.name ?? 'Deleted session', slug: meta?.slug ?? null });
    sessionsByParty.set(session.partyId, list);
  }

  const liveByParty = new Map<string, LiveRoomRow[]>();
  for (const room of liveRooms) {
    const list = liveByParty.get(room.partyId) ?? [];
    list.push({
      sessionName: room.gameSessionId ? (sessionsById.get(room.gameSessionId)?.name ?? 'Deleted session') : null,
      connections: room.connections,
      lastEventAt: room.lastEventAt
    });
    liveByParty.set(room.partyId, list);
  }

  const parties: PartyUsageRow[] = partyIds.map((partyId) => {
    const meta = partiesById.get(partyId);
    const partySessions = sessionsByParty.get(partyId) ?? [];
    const partyRoom = partyRooms.get(partyId);
    const partyLive = liveByParty.get(partyId) ?? [];
    const activeSeconds = partySessions.reduce((total, s) => total + s.activeSeconds, 0);
    const idleSeconds = partySessions.reduce((total, s) => total + s.idleSeconds, 0);
    const lastActive = [...partySessions.map((s) => s.lastActiveAt), partyRoom?.lastActiveAt ?? null].filter(
      (t): t is number => t !== null
    );
    return {
      id: partyId,
      name: meta?.name ?? 'Deleted party',
      slug: meta?.slug ?? '',
      plan: meta?.plan ?? 'free',
      planStatus: meta?.planStatus ?? null,
      isUpgraded: (meta?.plan ?? 'free') !== 'free',
      adminEmails: (adminsByParty.get(partyId) ?? []).sort(),
      createdAt: meta?.createdAt ? meta.createdAt.getTime() : null,
      sessionCount: partySessions.length,
      sittings: partySessions.reduce((total, s) => total + s.sittings, 0),
      activeSeconds,
      idleSeconds,
      idleShare: activeSeconds > 0 ? idleSeconds / activeSeconds : 0,
      lastActiveAt: lastActive.length > 0 ? Math.max(...lastActive) : null,
      partyRoomActiveSeconds: partyRoom?.activeSeconds ?? 0,
      liveRooms: partyLive,
      liveClients: Math.max(
        partyLive.find((room) => room.sessionName === null)?.connections ?? 0,
        partyLive.filter((room) => room.sessionName !== null).reduce((total, room) => total + room.connections, 0)
      ),
      sessions: partySessions
    };
  });
  parties.sort(
    (a, b) => Number(b.liveRooms.length > 0) - Number(a.liveRooms.length > 0) || b.activeSeconds - a.activeSeconds
  );

  const activeSeconds = sessions.reduce((total, s) => total + s.activeSeconds, 0);
  const idleSeconds = sessions.reduce((total, s) => total + s.idleSeconds, 0);
  const summary: UsageSummary = {
    roomsTouched: sessions.length,
    roomsWithPlay: sessions.filter((s) => s.sittings > 0).length,
    sittings: sessions.reduce((total, s) => total + s.sittings, 0),
    activeSeconds,
    idleShare: activeSeconds > 0 ? idleSeconds / activeSeconds : 0,
    partyRoomActiveSeconds: [...partyRooms.values()].reduce((total, room) => total + room.activeSeconds, 0),
    liveRooms: liveRooms.length
  };

  return { windowDays, generatedAt: now, summary, parties };
};
