import type { Snippet } from 'svelte';

export type ContextMenuItem = {
  type?: 'divider';
  label?: string;
  href?: string;
  onclick?: () => void;
  end?: Snippet;
  disabled?: boolean;
};

export type ContextMenuProps = {
  items: ContextMenuItem[];
  trigger: Snippet;
};
