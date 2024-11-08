import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export type TitleProps = {
  children: Snippet;
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'p';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: string;
} & HTMLAttributes<HTMLHeadingElement>;
