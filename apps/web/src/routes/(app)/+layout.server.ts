import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const { user } = await event.parent();
  if (!event.locals.user || !user) return redirect(302, '/login');
  return { user };
};
