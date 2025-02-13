import type { Placement } from '@floating-ui/dom';
import type { CreateRadioGroupProps } from '@melt-ui/svelte';
import type { FloatingConfig } from '@melt-ui/svelte/internal/actions';
import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';
import type { Writable } from 'svelte/store';
import type { SelectOption } from '../Select';

export type RadioMenuItem = {
  label: string;
  value: string;
  href?: string;
  onclick?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
};

export type RadioMenuProps = CreateRadioGroupProps & {
  trigger: Snippet;
  items: RadioMenuItem[];
  defaultItem: RadioMenuItem;
  positioning?: FloatingConfig;
  customValue?: Writable<string>;
  footer?: Snippet<[{ close: () => void }]>;
};

export type SelectorMenuProps = {
  trigger: Snippet;
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
