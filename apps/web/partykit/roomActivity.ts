import type * as Party from 'partykit/server';
import type { RoomActivityEventWire, RoomActivityKindWire, RoomActivityWire } from '../src/lib/realtime/wire';
import { appRequest } from './appApi';

const BATCH_MS = 1000;
const MAX_BATCH = 50;

const userIdFromConnection = (conn: Party.Connection): string | null => {
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
export const createRoomActivityReporter = (room: Party.Room, kind: RoomActivityWire['room']) => {
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
      const payload: RoomActivityWire = { room: kind, roomId: room.id, events };
      try {
        await appRequest(room, '/api/internal/roomActivity', payload);
      } catch (error) {
        console.warn(`roomActivity failed for ${kind}/${room.id}`, error);
      }
    }
  };

  const queue = (eventKind: RoomActivityKindWire, conn: Party.Connection) => {
    pending.push({
      kind: eventKind,
      userId: userIdFromConnection(conn),
      connections: [...room.getConnections()].length,
      at: Date.now()
    });
    if (!timer) timer = setTimeout(() => void flush(), BATCH_MS);
  };

  return { queue, flush };
};
