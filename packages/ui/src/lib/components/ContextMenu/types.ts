import type { ContextMenuItemProps, CreateContextMenuProps } from '@melt-ui/svelte';
import type { Snippet } from 'svelte';

export type ContextMenuItem = ContextMenuItemProps & {
  type?: 'divider';
  label: string;
  href?: string;
  onclick?: (data: T) => void;
  end?: Snippet;
};

export type ContextMenuProps = CreateContextMenuProps & {
  items: ContextMenuItem[];
  trigger: Snippet;
};
