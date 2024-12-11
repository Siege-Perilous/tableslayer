import { createSceneSchema, deleteSceneSchema } from '$lib/schemas';
import { createScene, deleteScene, getSceneFromOrder, getScenes } from '$lib/server/scene';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
  const { gameSession } = await parent();
  let activeSceneNumber = Number(params.activeScene);
  if (isNaN(activeSceneNumber)) {
    activeSceneNumber = 1;
  }

  const scenes = await getScenes(gameSession.dbName);
  const createSceneForm = await superValidate(zod(createSceneSchema));
  const deleteSceneForm = await superValidate(zod(deleteSceneSchema));
  const activeScene = await getSceneFromOrder(gameSession.dbName, activeSceneNumber);

  return { createSceneForm, scenes, activeSceneNumber, activeScene, deleteSceneForm };
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
  },
  deleteScene: async (event) => {
    //  const userId = event.locals.user.id;
    const deleteSceneForm = await superValidate(event.request, zod(deleteSceneSchema));
    if (!deleteSceneForm.valid) {
      return message(deleteSceneForm, { type: 'error', text: 'Invalid scene data' }, { status: 400 });
    }
    try {
      const { dbName, sceneId } = deleteSceneForm.data;
      await deleteScene(dbName, sceneId);
      return message(deleteSceneForm, { type: 'success', text: 'Scene deleted' });
    } catch (error) {
      console.error('Error deleting scene', error);
      return message(deleteSceneForm, { type: 'error', text: 'Error deleting scene' }, { status: 500 });
    }
  }
};
