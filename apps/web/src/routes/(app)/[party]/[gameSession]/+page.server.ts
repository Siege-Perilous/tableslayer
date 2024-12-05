import { createSceneSchema } from '$lib/schemas';
import { createScene, getScenes } from '$lib/server/scene';
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
    const userId = event.locals.user.id;
    const createSceneForm = await superValidate(event.request, zod(createSceneSchema));
    if (!createSceneForm.valid) {
      return message(createSceneForm, { type: 'error', text: 'Invalid scene data' }, { status: 400 });
    }

    try {
      const { name, file, order, dbName } = createSceneForm.data;

      await createScene(dbName, userId, name, order, file);

      return message(createSceneForm, { type: 'success', text: 'Scene created' });
    } catch (error) {
      console.error('Error creating scene', error);
      return message(createSceneForm, { type: 'error', text: 'Error creating scene' }, { status: 500 });
    }
  }
};
