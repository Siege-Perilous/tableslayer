import type { Placement } from '@floating-ui/dom';
import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';

export type SelectOption = { label: string | Snippet; value: string; [key: string]: unknown };
export type SelectGroupedOptions = Record<string, SelectOption[]>;
export type SelectOptions = SelectOption[] | SelectGroupedOptions;

export type SelectProps = {
  disabled?: boolean;
  multiple?: boolean;
  variant?: 'default' | 'transparent';
  selectedPrefix?: Snippet;
  selected: string[];
  options: SelectOptions;
  onSelectedChange?: (selected: string[]) => void;
  positioning?: {
    placement?: Placement;
    offset?: number;
  };
} & HTMLButtonAttributes;
