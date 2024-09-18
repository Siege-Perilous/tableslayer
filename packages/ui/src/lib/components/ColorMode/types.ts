import type { Snippet } from 'svelte';
import type { HTMLBaseAttributes, SvelteHTMLElements } from 'svelte/elements';

export type ColorModeCompareProps = {
  children: Snippet;
};

export type ColorModeProps = {
  children: Snippet;
  mode: 'light' | 'dark';
  as?: keyof SvelteHTMLElements;
} & HTMLBaseAttributes;
