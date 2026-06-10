import { insertAnnotationSchema, insertLightSchema, insertMarkerSchema, insertSceneSchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import type { PersistSessionWire } from '$lib/realtime/wire';
import { applySessionPersist, assertInternalRequest } from '$lib/server/realtime';
import { z } from 'zod';

const sceneWireSchema = z.object({
  settings: insertSceneSchema
    .omit({ fogOfWarMask: true, annotationLayers: true, lastUpdated: true })
    // The doc uses fractional ordering; SQLite stores it fine in the integer column.
    // id is required here (column defaults make it optional in the insert schema).
    .extend({ id: z.string(), order: z.number() }),
  markers: z.array(insertMarkerSchema),
  lights: z.array(insertLightSchema),
  annotations: z.array(insertAnnotationSchema),
  fogMask: z.string().nullable().optional(),
  parts: z.array(z.enum(['settings', 'markers', 'lights', 'annotations', 'fogMask']))
});

const validationSchema = z.object({
  gameSessionId: z.string(),
  scenes: z.array(sceneWireSchema),
  deletedSceneIds: z.array(z.string())
});

// Called by the PartyKit game session server's debounced persister. The server is
// the only writer of scene data to the DB; clients never save scene state.
export const POST = apiFactory(
  async (event) => {
    assertInternalRequest(event.request);
    // Zod leaves defaulted columns optional; the persister always sends full rows
    await applySessionPersist(event.body as PersistSessionWire);
    return { ok: true };
  },
  {
    validationSchema,
    unauthorizedMessage: 'Invalid internal token.',
    unexpectedErrorMessage: 'Failed to persist session.'
  }
);
