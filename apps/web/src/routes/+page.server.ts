import { getAssetInfo, getUser, uploadImage } from '$lib/server';
import { v2 as cloudinary } from 'cloudinary';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  let user = null;
  if (event.locals.user) {
    const userId = event.locals.user.id;
    user = await getUser(userId);
  }

  cloudinary.config({
    secure: true
  });

  const publicId = (await uploadImage(
    'https://www.milwaukeeindependent.com/wp-content/uploads/2022/09/090222_ThereBeDragons_STK_TStudio.jpg'
  )) as string;

  const color = await getAssetInfo(publicId);
  console.log('color', color);

  const optimizedImage = cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto'
  });
  console.log('optimizedImage', optimizedImage);

  const image = cloudinary.image(publicId, {
    effect: 'gen_replace:from_the dragon;to_a wolf;'
  });

  return {
    user,
    image
  };
}) satisfies PageServerLoad;
