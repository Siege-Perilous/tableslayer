import type { usePartyData } from '$lib/utils/yjs/stores';
import type { SvelteComponentTyped } from 'svelte';

export interface UpdateMapImageProps {
  sceneId: string;
  partyId: string;
  partyData: ReturnType<typeof usePartyData> | null;
}

export default class UpdateMapImage extends SvelteComponentTyped<UpdateMapImageProps> {}

export const openFileDialog: () => Promise<void>;
