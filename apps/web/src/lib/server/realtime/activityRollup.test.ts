import { describe, expect, it } from 'vitest';
import {
  OPEN_INTERVAL_CAP_MS,
  buildActiveIntervals,
  clipIntervals,
  countSittings,
  findLiveRooms,
  idleIntervals,
  rollupActivity,
  unionIntervals,
  type ActivityEvent
} from './activityRollup';

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.UTC(2026, 8, 1, 12, 0, 0);

const event = (
  kind: ActivityEvent['kind'],
  offsetMs: number,
  connections: number | null = null,
  gameSessionId: string | null = 'gs1',
  partyId = 'p1'
): ActivityEvent => ({ partyId, gameSessionId, kind, connections, createdAt: new Date(T0 + offsetMs) });

describe('buildActiveIntervals', () => {
  it('pairs connect and close into one interval', () => {
    const intervals = buildActiveIntervals(
      [event('connect', 0, 1), event('connect', MIN, 2), event('close', 2 * MIN, 1), event('close', 3 * MIN, 0)],
      T0 + HOUR
    );
    expect(intervals).toEqual([{ start: T0, end: T0 + 3 * MIN, open: false }]);
  });

  it('repairs a missed close when a fresh connect reports one socket', () => {
    const intervals = buildActiveIntervals(
      [event('connect', 0, 1), event('connect', 2 * HOUR, 1), event('close', 3 * HOUR, 0)],
      T0 + 4 * HOUR
    );
    expect(intervals).toEqual([
      { start: T0, end: T0 + OPEN_INTERVAL_CAP_MS, open: false },
      { start: T0 + 2 * HOUR, end: T0 + 3 * HOUR, open: false }
    ]);
  });

  it('a repaired close never lands after the new connect', () => {
    const intervals = buildActiveIntervals([event('connect', 0, 1), event('connect', 5 * MIN, 1)], T0 + 6 * MIN);
    expect(intervals[0]).toEqual({ start: T0, end: T0 + 5 * MIN, open: false });
  });

  it('a trailing open interval runs to now while recent, else caps after the last event', () => {
    const events = [event('connect', 0, 1), event('edit', 10 * MIN)];
    expect(buildActiveIntervals(events, T0 + 20 * MIN)).toEqual([{ start: T0, end: T0 + 20 * MIN, open: true }]);
    expect(buildActiveIntervals(events, T0 + 5 * HOUR)).toEqual([
      { start: T0, end: T0 + 10 * MIN + OPEN_INTERVAL_CAP_MS, open: false }
    ]);
  });

  it('ignores non-socket events for interval boundaries', () => {
    expect(buildActiveIntervals([event('edit', 0), event('party_state', MIN)], T0 + HOUR)).toEqual([]);
  });
});

describe('unionIntervals / clipIntervals', () => {
  it('merges overlapping and touching intervals', () => {
    expect(
      unionIntervals([
        { start: 0, end: 10, open: false },
        { start: 5, end: 20, open: false },
        { start: 20, end: 30, open: true },
        { start: 40, end: 50, open: false }
      ])
    ).toEqual([
      { start: 0, end: 30, open: true },
      { start: 40, end: 50, open: false }
    ]);
  });

  it('clips to the window and drops empty results', () => {
    expect(
      clipIntervals(
        [
          { start: 0, end: 10, open: false },
          { start: 20, end: 30, open: false },
          { start: 35, end: 60, open: false }
        ],
        { start: 25, end: 50 }
      )
    ).toEqual([
      { start: 25, end: 30, open: false },
      { start: 35, end: 50, open: false }
    ]);
  });
});

describe('idleIntervals', () => {
  it('keeps intervals with no edit, ping, or party state inside', () => {
    const intervals = [
      { start: T0, end: T0 + HOUR, open: false },
      { start: T0 + 2 * HOUR, end: T0 + 3 * HOUR, open: false }
    ];
    const idle = idleIntervals(intervals, [event('edit', 30 * MIN), event('connect', 2 * HOUR + MIN, 1)]);
    expect(idle).toEqual([intervals[1]]);
  });
});

describe('countSittings', () => {
  it('counts a UTC day with two sockets and enough edits', () => {
    const play = [
      event('connect', 0, 1),
      event('connect', MIN, 2),
      ...[1, 2, 3, 4, 5].map((i) => event('edit', i * 2 * MIN))
    ];
    expect(countSittings(play)).toBe(1);
    expect(countSittings(play.slice(0, -1))).toBe(0);
    expect(countSittings([event('connect', 0, 1), ...[1, 2, 3, 4, 5].map((i) => event('edit', i * MIN))])).toBe(0);
  });

  it('counts each day separately', () => {
    const day = (offset: number) => [
      event('connect', offset, 1),
      event('connect', offset + MIN, 2),
      ...[1, 2, 3, 4, 5].map((i) => event('edit', offset + i * 2 * MIN))
    ];
    expect(countSittings([...day(0), ...day(24 * HOUR)])).toBe(2);
  });
});

describe('findLiveRooms', () => {
  it('reports rooms with sockets open and a recent event', () => {
    const events = [
      event('connect', 0, 1),
      event('connect', 5 * MIN, 2),
      event('connect', 0, 1, 'gs2'),
      event('close', 2 * MIN, 0, 'gs2'),
      event('connect', -3 * HOUR, 1, 'gs3'),
      event('connect', 0, 1, null)
    ];
    const live = findLiveRooms(events, T0 + 10 * MIN);
    expect(live.map((room) => room.gameSessionId).sort()).toEqual([null, 'gs1'].sort());
    expect(live.find((room) => room.gameSessionId === 'gs1')?.connections).toBe(2);
  });
});

describe('rollupActivity', () => {
  it('rolls sessions and party rooms up separately', () => {
    const events = [
      event('connect', 0, 1),
      event('connect', MIN, 2),
      ...[1, 2, 3, 4, 5].map((i) => event('edit', i * 5 * MIN)),
      event('close', HOUR, 1),
      event('close', HOUR + MIN, 0),
      event('connect', 0, 1, null),
      event('party_state', 10 * MIN, null, null),
      event('close', HOUR + MIN, 0, null),
      event('connect', 0, 1, 'gs2', 'p2'),
      event('close', 2 * HOUR, 0, 'gs2', 'p2')
    ];
    const window = { start: T0 - HOUR, end: T0 + 3 * HOUR };
    const { sessions, partyRooms } = rollupActivity(events, window, T0 + 3 * HOUR);

    expect(sessions.map((s) => s.gameSessionId)).toEqual(['gs2', 'gs1']);
    const gs1 = sessions.find((s) => s.gameSessionId === 'gs1')!;
    expect(gs1.activeSeconds).toBe((HOUR + MIN) / 1000);
    expect(gs1.idleShare).toBe(0);
    expect(gs1.sittings).toBe(1);
    expect(gs1.peakConnections).toBe(2);
    expect(gs1.editCount).toBe(5);
    expect(gs1.live).toBe(false);

    const gs2 = sessions.find((s) => s.gameSessionId === 'gs2')!;
    expect(gs2.idleShare).toBe(1);
    expect(gs2.sittings).toBe(0);

    expect(partyRooms.get('p1')?.activeSeconds).toBe((HOUR + MIN) / 1000);
    expect(partyRooms.has('p2')).toBe(false);
  });

  it('clips activity that straddles the window start', () => {
    const events = [event('connect', -2 * HOUR, 1), event('close', HOUR, 0)];
    const { sessions } = rollupActivity(events, { start: T0, end: T0 + 2 * HOUR }, T0 + 2 * HOUR);
    expect(sessions[0].activeSeconds).toBe(HOUR / 1000);
  });
});
