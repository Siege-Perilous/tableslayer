import type { FloatingConfig } from '@melt-ui/svelte/internal/actions';
import type { Snippet } from 'svelte';

export type RadioMenuProps = {
  trigger: Snippet;
  items: {
    label: string;
    value: string;
    href?: string;
  }[];
  defaultItem: RadioMenuProps['items'];
  positioning: FloatingConfig;
};
