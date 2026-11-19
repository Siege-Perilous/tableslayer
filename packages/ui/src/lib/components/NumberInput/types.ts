import type { HTMLInputAttributes } from 'svelte/elements';

export type NumberInputProps = {
  /** The number, or null while the field is empty. */
  value: number | null;
  /** Told once the number is settled: on a step, on Enter, or on leaving the field. Not on every key. */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Whether the field may be left empty. If not, emptying it puts the last number back. */
  allowEmpty?: boolean;
  variant?: 'default' | 'transparent';
  size?: 'sm' | 'md';
  /** Whether the buttons that step the number up and down are shown. The arrow keys step it either way. */
  hasStepper?: boolean;
  disabled?: boolean;
  element?: HTMLInputElement;
} & Omit<HTMLInputAttributes, 'value' | 'min' | 'max' | 'step' | 'size' | 'disabled' | 'type'>;
