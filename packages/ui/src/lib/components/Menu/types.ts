import type { FloatingConfig } from '@melt-ui/svelte/internal/actions';
import type { Snippet } from 'svelte';

export type RadioMenuItem = {
  label: string;
  value: string;
  href?: string;
};

export type RadioMenuProps = {
  trigger: Snippet;
  items: RadioMenuItem[];
  defaultItem: RadioMenuItem;
  positioning: FloatingConfig;
};
