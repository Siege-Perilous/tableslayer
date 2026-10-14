import type { Connection } from 'partyserver';
import type { RoomActivityEventWire, RoomActivityKindWire, RoomActivityWire } from '../src/lib/realtime/wire';
import { appRequest, type AppApiEnv } from './appApi';

const BATCH_MS = 1000;
const MAX_BATCH = 50;

export interface ActivityRoom {
  name: () => string;
  env: AppApiEnv;
  connections: () => number;
}

// conn.uri is the upgrade request URL; PartyServer keeps it in the socket
// attachment, so it is still readable on a connection rehydrated after hibernation
const userIdFromConnection = (conn: Connection): string | null => {
  if (!conn.uri) return null;
  try {
    return new URL(conn.uri).searchParams.get('userId');
  } catch {
    return null;
  }
};

/**
 * Best-effort connect/close reporting to the app's usage log. Events batch for a
 * second so a flapping client costs one subrequest. Nothing here throws or
 * retries: usage accounting must never affect the room itself.
 */
export const createRoomActivityReporter = (room: ActivityRoom, kind: RoomActivityWire['room']) => {
  let pending: RoomActivityEventWire[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    while (pending.length > 0) {
      const events = pending.slice(0, MAX_BATCH);
      pending = pending.slice(MAX_BATCH);
      const payload: RoomActivityWire = { room: kind, roomId: room.name(), events };
      try {
        await appRequest(room.env, '/api/internal/roomActivity', payload);
      } catch (error) {
        console.warn(`roomActivity failed for ${kind}/${room.name()}`, error);
      }
    }
  };

  const queue = (eventKind: RoomActivityKindWire, conn: Connection) => {
    pending.push({
      kind: eventKind,
      userId: userIdFromConnection(conn),
      connections: room.connections(),
      at: Date.now()
    });
    if (!timer) timer = setTimeout(() => void flush(), BATCH_MS);
  };

  return { queue, flush };
};
