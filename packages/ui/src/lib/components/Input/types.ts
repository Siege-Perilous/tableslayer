import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLInputTypeAttribute, HTMLLabelAttributes } from 'svelte/elements';

export type InputProps = {
  value: string;
  type: HTMLInputTypeAttribute;
  placeholder?: string;
  isDisabled?: boolean;
} & HTMLInputAttributes;

export type LabelProps = {
  id: string;
  children: Snippet;
} & HTMLLabelAttributes;
