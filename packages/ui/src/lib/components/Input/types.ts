import type { LabelProps as FormSnapLabelProps } from 'formsnap';
import type { Snippet } from 'svelte';
import type { HTMLInputAttributes } from 'svelte/elements';

export type InputProps = {
  isDisabled?: boolean;
  variant?: 'transparent' | 'default' | 'dropzone';
  hideAutocomplete?: boolean;
} & HTMLInputAttributes;

export type FileInputProps = {
  files: FileList;
} & InputProps;

export type LabelProps = {
  children: Snippet;
  props?: Record<string, unknown>;
} & FormSnapLabelProps;
