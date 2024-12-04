import { gsChildDb } from '$lib/db/gs';
import { sceneTable } from '$lib/db/gs/schema';
export const getScenes = async (dbName: string) => {
  const db = gsChildDb(dbName);
  const scenes = await db.select().from(sceneTable).orderBy(sceneTable.order).all();

  return scenes;
};
