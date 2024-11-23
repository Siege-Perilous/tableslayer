import type { HTMLAttributes } from 'svelte/elements';

export type CardFanProps = {
  images: string[];
  height?: string;
} & HTMLAttributes<HTMLDivElement>;
