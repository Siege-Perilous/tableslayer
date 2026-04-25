import { db } from '$lib/db/app';
import { lightTable, type SelectLight } from '$lib/db/app/schema';
import { asc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const getLightsForScene = async (sceneId: string): Promise<SelectLight[]> => {
  const lights = await db.select().from(lightTable).where(eq(lightTable.sceneId, sceneId)).orderBy(asc(lightTable.id));

  return lights;
};

export const createLight = async (lightData: Partial<SelectLight>, sceneId: string): Promise<SelectLight> => {
  const id = lightData.id || uuidv4();

  const light = await db
    .insert(lightTable)
    .values({
      ...lightData,
      sceneId,
      id
    })
    .returning()
    .get();

  return light;
};

export const updateLight = async (lightId: string, lightData: Partial<SelectLight>): Promise<SelectLight> => {
  const light = await db.update(lightTable).set(lightData).where(eq(lightTable.id, lightId)).returning().get();

  return light;
};

export const deleteLight = async (lightId: string): Promise<void> => {
  await db.delete(lightTable).where(eq(lightTable.id, lightId));
};

export const getLight = async (lightId: string): Promise<SelectLight | undefined> => {
  return await db.select().from(lightTable).where(eq(lightTable.id, lightId)).get();
};
