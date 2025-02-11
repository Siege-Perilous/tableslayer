import type { SvelteComponentTyped } from 'svelte';

export interface UpdateMapImageProps {
  sceneId: string;
  partyId: string;
}

export default class UpdateMapImage extends SvelteComponentTyped<UpdateMapImageProps> {}

export const openFileDialog: () => Promise<void>;
