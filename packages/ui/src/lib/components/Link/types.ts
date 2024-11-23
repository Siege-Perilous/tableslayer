import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes, SvelteHTMLElements } from 'svelte/elements';
export type LinkProps = {
  children: Snippet;
  color?: 'primary' | 'fg' | 'bg' | 'accent' | 'muted';
} & HTMLAnchorAttributes;

export type LinkBoxProps = {
  children: Snippet;
  as?: keyof SvelteHTMLElements;
};

export type LinkOverlayProps = {
  children: Snippet;
  href: string;
};
