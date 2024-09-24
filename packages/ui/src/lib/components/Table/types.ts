import type { Snippet } from 'svelte';
import type { HTMLTableAttributes, HTMLThAttributes } from 'svelte/elements';

export type TableProps = {
  children: Snippet;
} & HTMLTableAttributes;

export type ThProps = {
  children: Snippet;
} & HTMLThAttributes;

export type TdProps = {
  children: Snippet;
} & HTMLThAttributes;
