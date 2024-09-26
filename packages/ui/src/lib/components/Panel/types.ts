import type { HTMLBaseAttributes } from 'svelte/elements';

export type PanelProps = {
  variant?: 'rounded' | 'cut';
  borderWidth?: number;
} & HTMLBaseAttributes;
