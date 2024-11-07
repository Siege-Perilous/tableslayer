import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export type TextProps = {
  children: Snippet;
  as?: 'p' | 'span';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: string;
} & HTMLAttributes<HTMLHeadingElement>;
