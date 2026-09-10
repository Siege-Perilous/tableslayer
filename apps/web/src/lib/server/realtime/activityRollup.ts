import type { RealtimeActivityKind } from '$lib/db/app/schema';

// Pure rollup of realtime_activity rows into per-room usage. No DB, no clock:
// callers pass `now`. A "room" is a game session (gameSessionId set) or the
// party room (gameSessionId null); Cloudflare bills each room's wall-clock
// time while it holds any socket, so active intervals are the cost unit.

export const SITTING_MIN_EDITS = 5;
export const SITTING_MIN_PEAK_CONNECTIONS = 2;
/** A missed close (evicted room, lost request) ends an interval this long after its last event. */
export const OPEN_INTERVAL_CAP_MS = 30 * 60 * 1000;
export const LIVE_WINDOW_MS = 30 * 60 * 1000;
/** Load this much before the window so intervals that straddle its start are seen. */
export const ROLLUP_LOOKBACK_MS = 24 * 60 * 60 * 1000;
export const ROLLUP_TIME_ZONE = 'UTC';

export interface ActivityEvent {
  partyId: string;
  gameSessionId: string | null;
  kind: RealtimeActivityKind;
  connections: number | null;
  createdAt: Date;
}

export interface TimeWindow {
  start: number;
  end: number;
}

export interface Interval {
  start: number;
  end: number;
  /** Still open at `now` (no close seen and the cap has not elapsed). */
  open: boolean;
}

export interface SessionUsage {
  partyId: string;
  gameSessionId: string;
  activeSeconds: number;
  idleSeconds: number;
  /** 0..1 share of active time with no edit/ping/party_state inside it. */
  idleShare: number;
  sittings: number;
  peakConnections: number;
  editCount: number;
  lastActiveAt: number | null;
  live: boolean;
}

export interface PartyRoomUsage {
  partyId: string;
  activeSeconds: number;
  lastActiveAt: number | null;
  live: boolean;
}

export interface LiveRoom {
  partyId: string;
  gameSessionId: string | null;
  connections: number;
  lastEventAt: number;
}

const isSocketEvent = (event: ActivityEvent) => event.kind === 'connect' || event.kind === 'close';
const isActivityMarker = (event: ActivityEvent) =>
  event.kind === 'edit' || event.kind === 'editor_active' || event.kind === 'party_state';
const at = (event: ActivityEvent) => event.createdAt.getTime();
const sortByTime = (events: ActivityEvent[]) => [...events].sort((a, b) => at(a) - at(b));

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ROLLUP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
export const dayKey = (ms: number) => dayKeyFormatter.format(new Date(ms));

/**
 * Walk connect/close rows into [open, close) intervals. `connections` is the
 * socket count after the event: > 0 opens, 0 closes. A connect reporting a
 * single socket while we still think the room is open means a close was
 * missed; the prior interval is closed at min(now event, last socket event + cap).
 */
export const buildActiveIntervals = (events: ActivityEvent[], now: number): Interval[] => {
  const intervals: Interval[] = [];
  let openStart: number | null = null;
  let lastSocketEventAt: number | null = null;
  let lastEventAt: number | null = null;

  for (const event of sortByTime(events)) {
    const t = at(event);
    lastEventAt = t;
    if (!isSocketEvent(event)) continue;
    const connections = event.connections ?? 0;

    if (event.kind === 'connect' && connections === 1 && openStart !== null) {
      const repairedEnd = Math.min(t, (lastSocketEventAt ?? t) + OPEN_INTERVAL_CAP_MS);
      intervals.push({ start: openStart, end: Math.max(openStart, repairedEnd), open: false });
      openStart = t;
    } else if (connections > 0 && openStart === null) {
      openStart = t;
    } else if (connections === 0 && openStart !== null) {
      intervals.push({ start: openStart, end: t, open: false });
      openStart = null;
    }
    lastSocketEventAt = t;
  }

  if (openStart !== null) {
    const capEnd = (lastEventAt ?? openStart) + OPEN_INTERVAL_CAP_MS;
    const stillOpen = now <= capEnd;
    intervals.push({ start: openStart, end: Math.max(openStart, stillOpen ? now : capEnd), open: stillOpen });
  }
  return intervals;
};

export const unionIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
      last.open = last.open || interval.open;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
};

export const clipIntervals = (intervals: Interval[], window: TimeWindow): Interval[] =>
  intervals
    .map((interval) => ({
      ...interval,
      start: Math.max(interval.start, window.start),
      end: Math.min(interval.end, window.end)
    }))
    .filter((interval) => interval.end > interval.start);

const sumSeconds = (intervals: Interval[]) =>
  intervals.reduce((total, interval) => total + (interval.end - interval.start), 0) / 1000;

const inWindow = (events: ActivityEvent[], window: TimeWindow) =>
  events.filter((event) => at(event) >= window.start && at(event) <= window.end);

/** Active intervals with no activity marker inside them. */
export const idleIntervals = (intervals: Interval[], markers: ActivityEvent[]): Interval[] => {
  const markerTimes = markers.filter(isActivityMarker).map(at);
  return intervals.filter((interval) => !markerTimes.some((t) => t >= interval.start && t <= interval.end));
};

/**
 * A sitting is a day (UTC) on which a room saw at least two sockets at once and
 * enough persisted edits to be real play. Sum across rooms: a room-day is the
 * Cloudflare cost unit.
 */
export const countSittings = (events: ActivityEvent[]): number => {
  const days = new Map<string, { peak: number; edits: number }>();
  for (const event of events) {
    const key = dayKey(at(event));
    const day = days.get(key) ?? { peak: 0, edits: 0 };
    if (event.kind === 'connect') day.peak = Math.max(day.peak, event.connections ?? 0);
    if (event.kind === 'edit') day.edits++;
    days.set(key, day);
  }
  return [...days.values()].filter((day) => day.peak >= SITTING_MIN_PEAK_CONNECTIONS && day.edits >= SITTING_MIN_EDITS)
    .length;
};

const lastSocketState = (events: ActivityEvent[]): { connections: number; at: number } | null => {
  const sockets = sortByTime(events.filter(isSocketEvent));
  const last = sockets[sockets.length - 1];
  return last ? { connections: last.connections ?? 0, at: at(last) } : null;
};

const isLive = (events: ActivityEvent[], now: number) => {
  const last = lastSocketState(events);
  if (!last || last.connections <= 0) return false;
  return events.some((event) => now - at(event) <= LIVE_WINDOW_MS);
};

const roomKey = (event: ActivityEvent) => `${event.partyId}:${event.gameSessionId ?? ''}`;

const groupByRoom = (events: ActivityEvent[]) => {
  const rooms = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const key = roomKey(event);
    const list = rooms.get(key);
    if (list) list.push(event);
    else rooms.set(key, [event]);
  }
  return rooms;
};

/** Rooms whose last socket event left sockets open and that had any event recently. */
export const findLiveRooms = (events: ActivityEvent[], now: number): LiveRoom[] => {
  const live: LiveRoom[] = [];
  for (const roomEvents of groupByRoom(events).values()) {
    if (!isLive(roomEvents, now)) continue;
    const last = lastSocketState(roomEvents)!;
    const first = roomEvents[0];
    live.push({
      partyId: first.partyId,
      gameSessionId: first.gameSessionId,
      connections: last.connections,
      lastEventAt: Math.max(...roomEvents.map(at))
    });
  }
  return live.sort((a, b) => b.lastEventAt - a.lastEventAt);
};

export const rollupSession = (
  events: ActivityEvent[],
  partyMarkers: ActivityEvent[],
  window: TimeWindow,
  now: number
): SessionUsage => {
  const active = clipIntervals(unionIntervals(buildActiveIntervals(events, now)), window);
  const activeSeconds = sumSeconds(active);
  const idleSeconds = sumSeconds(idleIntervals(active, [...events, ...partyMarkers]));
  const windowed = inWindow(events, window);
  const first = events[0];
  return {
    partyId: first.partyId,
    gameSessionId: first.gameSessionId!,
    activeSeconds,
    idleSeconds,
    idleShare: activeSeconds > 0 ? idleSeconds / activeSeconds : 0,
    sittings: countSittings(windowed),
    peakConnections: Math.max(0, ...windowed.map((event) => event.connections ?? 0)),
    editCount: windowed.filter((event) => event.kind === 'edit').length,
    lastActiveAt: windowed.length > 0 ? Math.max(...windowed.map(at)) : null,
    live: isLive(events, now)
  };
};

export const rollupPartyRoom = (events: ActivityEvent[], window: TimeWindow, now: number): PartyRoomUsage => {
  const active = clipIntervals(unionIntervals(buildActiveIntervals(events, now)), window);
  const windowed = inWindow(events, window);
  return {
    partyId: events[0].partyId,
    activeSeconds: sumSeconds(active),
    lastActiveAt: windowed.length > 0 ? Math.max(...windowed.map(at)) : null,
    live: isLive(events, now)
  };
};

export interface ActivityRollup {
  sessions: SessionUsage[];
  /** Keyed by party id. Shown separately; not added to session hours (would double count). */
  partyRooms: Map<string, PartyRoomUsage>;
}

export const rollupActivity = (events: ActivityEvent[], window: TimeWindow, now: number): ActivityRollup => {
  const sessions: SessionUsage[] = [];
  const partyRooms = new Map<string, PartyRoomUsage>();
  const partyMarkersByParty = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    if (event.gameSessionId === null && isActivityMarker(event)) {
      const list = partyMarkersByParty.get(event.partyId);
      if (list) list.push(event);
      else partyMarkersByParty.set(event.partyId, [event]);
    }
  }

  for (const roomEvents of groupByRoom(events).values()) {
    const first = roomEvents[0];
    if (first.gameSessionId === null) {
      const usage = rollupPartyRoom(roomEvents, window, now);
      if (usage.activeSeconds > 0 || usage.lastActiveAt !== null) partyRooms.set(first.partyId, usage);
      continue;
    }
    const usage = rollupSession(roomEvents, partyMarkersByParty.get(first.partyId) ?? [], window, now);
    if (usage.activeSeconds > 0 || usage.lastActiveAt !== null) sessions.push(usage);
  }

  sessions.sort((a, b) => b.activeSeconds - a.activeSeconds);
  return { sessions, partyRooms };
};
