import { dev } from '$app/environment';
import { db } from '$lib/db/app';
import {
  annotationsTable,
  gameSessionTable,
  lightTable,
  markerTable,
  partyTable,
  sceneTable,
  type SelectScene
} from '$lib/db/app/schema';
import type { PartyStateWire, PersistSessionWire, SceneWire, SessionSnapshotWire } from '$lib/realtime/wire';
import { and, eq, inArray, notInArray } from 'drizzle-orm';

// Server-to-server auth for /api/internal/* — the PartyKit persister is the only
// caller. In production INTERNAL_API_TOKEN must be set on both sides; in dev both
// fall back to the same well-known token.
export const assertInternalRequest = (request: Request) => {
  const configured = process.env.INTERNAL_API_TOKEN || (dev ? 'dev-internal-token' : undefined);
  if (!configured || request.headers.get('x-internal-token') !== configured) {
    throw new Error('Unauthorized');
  }
};

const sceneRowToWire = (
  scene: SelectScene,
  markers: SceneWire['markers'],
  lights: SceneWire['lights'],
  annotations: SceneWire['annotations']
): SceneWire => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fogOfWarMask, annotationLayers, lastUpdated, ...settings } = scene;
  return { settings, markers, lights, annotations, fogMask: fogOfWarMask };
};

export const buildSessionSnapshot = async (gameSessionId: string): Promise<SessionSnapshotWire> => {
  const scenes = await db.select().from(sceneTable).where(eq(sceneTable.gameSessionId, gameSessionId)).all();
  const sceneIds = scenes.map((scene) => scene.id);

  const [markers, lights, annotations] =
    sceneIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db.select().from(markerTable).where(inArray(markerTable.sceneId, sceneIds)).all(),
          db.select().from(lightTable).where(inArray(lightTable.sceneId, sceneIds)).all(),
          db.select().from(annotationsTable).where(inArray(annotationsTable.sceneId, sceneIds)).all()
        ]);

  return {
    gameSessionId,
    scenes: scenes.map((scene) =>
      sceneRowToWire(
        scene,
        markers.filter((m) => m.sceneId === scene.id),
        lights.filter((l) => l.sceneId === scene.id),
        annotations.filter((a) => a.sceneId === scene.id)
      )
    )
  };
};

const replaceRows = async <T extends { id: string; sceneId: string }>(
  table: typeof markerTable | typeof lightTable | typeof annotationsTable,
  sceneId: string,
  rows: T[]
) => {
  if (rows.length === 0) {
    await db.delete(table).where(eq(table.sceneId, sceneId));
    return;
  }
  await db.delete(table).where(
    and(
      eq(table.sceneId, sceneId),
      notInArray(
        table.id,
        rows.map((row) => row.id)
      )
    )
  );
  for (const row of rows) {
    await db.insert(table).values(row).onConflictDoUpdate({ target: table.id, set: row });
  }
};

export const applySessionPersist = async (payload: PersistSessionWire) => {
  for (const scene of payload.scenes) {
    const sceneRow: Record<string, unknown> = { ...scene.settings, lastUpdated: new Date() };
    if (scene.parts.includes('fogMask')) {
      sceneRow.fogOfWarMask = scene.fogMask ?? null;
    }
    await db
      .insert(sceneTable)
      .values(sceneRow as typeof sceneTable.$inferInsert)
      .onConflictDoUpdate({ target: sceneTable.id, set: sceneRow });

    if (scene.parts.includes('markers')) await replaceRows(markerTable, scene.settings.id, scene.markers);
    if (scene.parts.includes('lights')) await replaceRows(lightTable, scene.settings.id, scene.lights);
    if (scene.parts.includes('annotations')) await replaceRows(annotationsTable, scene.settings.id, scene.annotations);
  }

  if (payload.deletedSceneIds.length > 0) {
    await db.delete(sceneTable).where(inArray(sceneTable.id, payload.deletedSceneIds));
  }

  await db
    .update(gameSessionTable)
    .set({ lastUpdated: new Date() })
    .where(eq(gameSessionTable.id, payload.gameSessionId));
};

export const getPartyStateSnapshot = async (partyId: string): Promise<PartyStateWire> => {
  const party = await db
    .select({ activeSceneId: partyTable.activeSceneId, isPaused: partyTable.gameSessionIsPaused })
    .from(partyTable)
    .where(eq(partyTable.id, partyId))
    .get();

  return {
    activeSceneId: party?.activeSceneId ?? null,
    isPaused: party?.isPaused ?? false
  };
};

export const applyPartyStatePersist = async (partyId: string, state: PartyStateWire) => {
  await db
    .update(partyTable)
    .set({ activeSceneId: state.activeSceneId, gameSessionIsPaused: state.isPaused })
    .where(eq(partyTable.id, partyId));
};

// After writing realtime-owned state to the DB directly (import, admin tools),
// tell the live room to rebuild from the database. Best-effort: if the room
// isn't running, the next connection hydrates from the DB anyway.
const requestRoomResync = async (party: 'party' | 'game_session', roomId: string) => {
  const host = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const token = process.env.INTERNAL_API_TOKEN || 'dev-internal-token';
  try {
    await fetch(`${protocol}://${host}/parties/${party}/${roomId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ type: 'resync' })
    });
  } catch (error) {
    console.warn(`room resync failed for ${party}/${roomId}`, error);
  }
};

export const requestPartyRoomResync = (partyId: string) => requestRoomResync('party', partyId);
export const requestGameSessionRoomResync = (gameSessionId: string) => requestRoomResync('game_session', gameSessionId);
