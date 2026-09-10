import { apiFactory } from '$lib/factories';
import {
  assertInternalRequest,
  getGameSessionPartyId,
  maybePruneRealtimeActivity,
  partyExists,
  recordRealtimeActivity,
  resolveKnownUserIds
} from '$lib/server/realtime';
import { z } from 'zod';

const validationSchema = z.object({
  room: z.enum(['party', 'game_session']),
  roomId: z.string(),
  events: z
    .array(
      z.object({
        kind: z.enum(['connect', 'close']),
        userId: z.string().nullable(),
        connections: z.number().int().min(0),
        at: z.number().int()
      })
    )
    .min(1)
    .max(50)
});

// Called by the PartyKit rooms' batched activity reporter. Unknown rooms (a
// deleted session, a diagnostics room) are acknowledged and ignored — the room
// must never see an error for usage accounting.
export const POST = apiFactory(
  async (event) => {
    assertInternalRequest(event.request);
    const { room, roomId, events } = event.body;

    const gameSessionId = room === 'game_session' ? roomId : null;
    const partyId =
      room === 'game_session' ? await getGameSessionPartyId(roomId) : (await partyExists(roomId)) ? roomId : null;
    if (!partyId) return { ok: true, ignored: true };

    // userId is an unauthenticated query param on the socket URL: keep only real users
    const knownUsers = await resolveKnownUserIds(events.flatMap((e) => (e.userId ? [e.userId] : [])));
    await recordRealtimeActivity(
      events.map((e) => ({
        partyId,
        gameSessionId,
        kind: e.kind,
        userId: e.userId && knownUsers.has(e.userId) ? e.userId : null,
        connections: e.connections,
        createdAt: new Date(e.at)
      }))
    );
    await maybePruneRealtimeActivity();
    return { ok: true };
  },
  {
    validationSchema,
    unauthorizedMessage: 'Invalid internal token.',
    unexpectedErrorMessage: 'Failed to record room activity.'
  }
);
