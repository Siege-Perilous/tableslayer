import { createSceneSchema } from '$lib/schemas';
import { getScenes } from '$lib/server/scene';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { gameSession } = await parent();
  const scenes = await getScenes(gameSession.dbName);

  const createSceneForm = await superValidate(zod(createSceneSchema));

  return { createSceneForm, scenes };
};

export const actions: Actions = {
  createScene: async (event) => {
    const createSceneForm = await superValidate(event.request, zod(createSceneSchema));
    if (!createSceneForm.valid) {
      return message(createSceneForm, { type: 'error', text: 'Invalid scene data' }, { status: 400 });
    }

    return message(createSceneForm, { type: 'success', text: 'Scene created' });
  }
};
