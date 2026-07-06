import type { Snippet } from 'svelte';

export type ContextMenuItem = {
  type?: 'divider' | 'label';
  label?: string;
  href?: string;
  onclick?: () => void;
  end?: Snippet;
  disabled?: boolean;
  /** When defined, reserves a leading check slot; true renders a check mark */
  selected?: boolean;
  variant?: 'default' | 'danger';
};

export type ContextMenuProps = {
  items: ContextMenuItem[];
  /** Optional right-click target. When omitted, open the menu imperatively via open(event) */
  trigger?: Snippet;
};
