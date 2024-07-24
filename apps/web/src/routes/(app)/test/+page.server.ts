import { createGameSessionDb } from '$lib/server/turso';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.session) {
    return fail(401);
  }
  try {
    await createGameSessionDb('187eade3-bccc-4d2e-8d02-337b33f8405f');
  } catch (error) {
    console.error(error);
    return fail(500);
  }
};
