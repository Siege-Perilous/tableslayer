import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes } from 'svelte/elements';
export type LinkProps = {
  children: Snippet;
  color?: 'primary' | 'fg' | 'bg' | 'accent' | 'muted';
} & HTMLAnchorAttributes;
