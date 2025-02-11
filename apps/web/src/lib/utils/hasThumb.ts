import type { SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';

export const hasThumb = (scene: SelectScene | (SelectScene & Thumb)) => {
  return 'thumb' in scene;
};
