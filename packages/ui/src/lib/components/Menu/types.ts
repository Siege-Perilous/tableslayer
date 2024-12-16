import type { CreateRadioGroupProps } from '@melt-ui/svelte';
import type { FloatingConfig } from '@melt-ui/svelte/internal/actions';
import type { Snippet } from 'svelte';
import type { Writable } from 'svelte/store';

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
