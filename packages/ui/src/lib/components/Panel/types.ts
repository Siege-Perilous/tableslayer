import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export type PanelProps = {
  children: Snippet;
  variant?: 'rounded' | 'cut';
  borderWidth?: number;
} & HTMLAttributes<HTMLDivElement>;
