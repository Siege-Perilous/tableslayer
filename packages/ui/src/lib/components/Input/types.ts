import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLLabelAttributes } from 'svelte/elements';

export type InputProps = {
  isDisabled?: boolean;
  variant?: 'transparent' | 'default' | 'dropzone';
  hideAutocomplete?: boolean;
} & HTMLInputAttributes;

export type FileInputProps = {
  files: FileList | null;
} & InputProps;

export type LabelProps = {
  children: Snippet;
  props?: Record<string, unknown>;
} & HTMLLabelAttributes;

export type InputSliderProps = {
  variant?: 'default' | 'opacity';
  hex?: string;
} & HTMLInputAttributes;
