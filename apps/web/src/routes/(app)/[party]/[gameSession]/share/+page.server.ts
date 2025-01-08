import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { activeScene } = await parent();
  if (!activeScene) {
    redirect(302, '/');
  }
  return {
    activeScene
  };
};
