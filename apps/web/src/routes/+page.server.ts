import { db } from '$lib/db';
import { scenesTable } from '$lib/db/schema';
import type { PageServerLoad } from './$types';

export const load = (async () => {
  const scenes = await db.select().from(scenesTable);
  return {
    scenes
  };
}) satisfies PageServerLoad;
