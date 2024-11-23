import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export type TextProps = {
  children: Snippet;
  as?: 'p' | 'span';
  size?: string;
  weight?: number;
  color?: string;
  style?: string;
} & HTMLAttributes<HTMLHeadingElement>;
