import type { Placement } from '@floating-ui/dom';
import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';
import type { SelectOption } from '../Select';

export type SelectorMenuProps = {
  trigger?: Snippet;
  variant?: 'default';
  selected?: string;
  options: SelectOption[];
  onSelectedChange?: (selected: string) => void;
  positioning?: {
    placement?: Placement;
    offset?: number;
  };
  footer?: Snippet<[{ footerProps: { close: () => void } }]>;
} & HTMLButtonAttributes;
