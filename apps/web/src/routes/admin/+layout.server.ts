import { isAdmin } from '$lib/server/admin';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user?.id) {
    throw redirect(302, '/login');
  }

  const adminCheck = await isAdmin(locals.user.id);
  if (!adminCheck) {
    throw redirect(302, '/');
  }

  return {};
};
