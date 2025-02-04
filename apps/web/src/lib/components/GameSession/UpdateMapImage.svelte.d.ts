import type { SvelteComponentTyped } from 'svelte';

export interface UpdateMapImageProps {
  sceneId: string;
  dbName: string;
  partyId: string;
}

export default class UpdateMapImage extends SvelteComponentTyped<UpdateMapImageProps> {}

export const openFileDialog: () => Promise<void>;
