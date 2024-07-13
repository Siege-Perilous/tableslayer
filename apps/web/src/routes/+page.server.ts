import { getUser } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  let user = null;
  if (event.locals.user) {
    const userId = event.locals.user.id;
    user = await getUser(userId);
  }

  /* const image = cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    width: 400,
    height: 400,
    crop: 'fit'
  }); */

  /* const image = cloudinary.image(publicId, {
    effect: 'gen_replace:from_the dragon;to_a wolf;'
  }); */

  return {
    user
  };
}) satisfies PageServerLoad;
