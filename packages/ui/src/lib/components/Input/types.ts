import type { LabelProps as FormSnapLabelProps } from 'formsnap';
import type { Snippet } from 'svelte';
import type { HTMLInputAttributes } from 'svelte/elements';

export type InputProps = {
  isDisabled?: boolean;
  variant?: 'transparent' | 'default';
} & HTMLInputAttributes;

export type LabelProps = {
  children: Snippet;
} & FormSnapLabelProps;
