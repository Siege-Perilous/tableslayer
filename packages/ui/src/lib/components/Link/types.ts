import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLBaseAttributes, SvelteHTMLElements } from 'svelte/elements';
export type LinkProps = {
  children: Snippet;
  color?: 'primary' | 'fg' | 'bg' | 'accent' | 'muted';
  as?: keyof SvelteHTMLElements;
} & HTMLAnchorAttributes;

export type LinkBoxProps = {
  children: Snippet;
  as?: keyof SvelteHTMLElements;
} & HTMLBaseAttributes;

export type LinkOverlayProps = {
  children: Snippet;
  href: string;
};
