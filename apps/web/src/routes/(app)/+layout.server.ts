import { getUser } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async (event) => {
  if (!event.locals.user) redirect(302, '/login');

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  if (!user) redirect(302, '/login');

  return {};
}) satisfies LayoutServerLoad;
