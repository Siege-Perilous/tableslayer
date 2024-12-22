import { createSceneSchema, deleteSceneSchema, SetActiveSceneSchema } from '$lib/schemas';
import { createScene, deleteScene, getSceneFromOrder, getScenes, setActiveScene } from '$lib/server/scene';
import { setToastCookie } from '@tableslayer/ui';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
  const { gameSession, activeScene } = await parent();
  let selectedSceneNumber = Number(params.selectedScene);
  if (isNaN(selectedSceneNumber)) {
    selectedSceneNumber = 1;
  }

  const scenes = await getScenes(gameSession.dbName);
  const createSceneForm = await superValidate(zod(createSceneSchema));
  const deleteSceneForm = await superValidate(zod(deleteSceneSchema));
  const setActiveSceneForm = await superValidate(zod(SetActiveSceneSchema));

  // check if activeSceneNumber is valid
  if (selectedSceneNumber < 1 || selectedSceneNumber > scenes.length) {
    selectedSceneNumber = 1;
  }
  const selectedScene = await getSceneFromOrder(gameSession.dbName, selectedSceneNumber);

  return {
    createSceneForm,
    scenes,
    selectedSceneNumber,
    selectedScene,
    deleteSceneForm,
    activeScene,
    setActiveSceneForm
  };
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
      // Use cookie version because form resets
      setToastCookie(event, {
        title: 'Scene created',
        type: 'success'
      });
    } catch (error) {
      console.error('Error creating scene', error);
      return message(createSceneForm, { type: 'error', text: 'Error creating scene' }, { status: 500 });
    }
  },
  setActiveScene: async (event) => {
    const setActiveSceneForm = await superValidate(event.request, zod(SetActiveSceneSchema));
    if (!setActiveSceneForm.valid) {
      return message(setActiveSceneForm, { type: 'error', text: 'Invalid scene data' }, { status: 400 });
    }
    try {
      const { dbName, sceneId } = setActiveSceneForm.data;
      await setActiveScene(dbName, sceneId);
      return message(setActiveSceneForm, { type: 'success', text: 'Scene set as active' });
    } catch (error) {
      console.error('Error setting active scene', error);
      return message(setActiveSceneForm, { type: 'error', text: 'Error setting active scene' }, { status: 400 });
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
