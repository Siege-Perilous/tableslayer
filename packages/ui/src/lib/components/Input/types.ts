import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLLabelAttributes } from 'svelte/elements';

export type InputProps = {
  isDisabled?: boolean;
  variant?: 'transparent' | 'default' | 'dropzone' | 'button';
  hideAutocomplete?: boolean;
  element?: HTMLInputElement;
} & HTMLInputAttributes;

export type InputCheckboxProps = {
  checked: boolean;
  label: Snippet | string;
} & InputProps;

export type FileInputProps = {
  files: FileList | null;
  accept?: string;
  showPreviews?: boolean;
} & InputProps;

export type LabelProps = {
  children: Snippet;
  props?: Record<string, unknown>;
} & HTMLLabelAttributes;

export type InputSliderProps = {
  variant?: 'default' | 'opacity';
  hex?: string;
} & HTMLInputAttributes;

export type DualInputSliderProps = {
  valueStart: number;
  valueEnd: number;
  color?: string;
  min: number;
  max: number;
  step: number;
} & HTMLInputAttributes;
