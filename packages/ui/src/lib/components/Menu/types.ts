import type { CreateRadioGroupProps } from '@melt-ui/svelte';
import type { FloatingConfig } from '@melt-ui/svelte/internal/actions';
import type { Snippet } from 'svelte';

export type RadioMenuItem = {
  label: string;
  value: string;
  href?: string;
  onclick?: () => void;
  icon?: any;
};

export type RadioMenuProps = CreateRadioGroupProps & {
  trigger: Snippet;
  items: RadioMenuItem[];
  defaultItem: RadioMenuItem;
  positioning?: FloatingConfig;
};
