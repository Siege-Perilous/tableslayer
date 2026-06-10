import type { SessionDocClient } from '$lib/realtime';
import type { SvelteComponentTyped } from 'svelte';

export interface UpdateMapImageProps {
  sceneId: string;
  client: SessionDocClient | null;
}

export default class UpdateMapImage extends SvelteComponentTyped<UpdateMapImageProps> {}

export const openFileDialog: () => Promise<void>;
