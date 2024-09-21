import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

export type InputProps = {
  value: string;
  type: HTMLInputTypeAttribute;
  placeholder?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
} & HTMLInputAttributes;

export type LabelProps = {
  id: string;
  children: Snippet;
};
