import type { HTMLAttributes } from 'svelte/elements';

export type SpacerProps = {
  size?: number;
} & HTMLAttributes<HTMLDivElement>;
