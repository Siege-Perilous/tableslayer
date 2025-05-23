import type { HTMLAttributes } from 'svelte/elements';

export type SpacerProps = {
  size?: string;
} & HTMLAttributes<HTMLDivElement>;
