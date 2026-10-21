import type { SelectScene } from '#lib/db/app/schema.js';
import type { Thumb } from '#lib/server/index.js';

export const hasThumb = (scene: SelectScene | (SelectScene & Thumb)) => {
  return 'thumb' in scene;
};
