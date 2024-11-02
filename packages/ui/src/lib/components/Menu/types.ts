import type { CreateMenuProps } from '@melt-ui/svelte';
import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';

export type RadioMenuProps = {
  trigger: Snippet;
  items: {
    label: string;
    value: string;
    href?: string;
  }[];
  defaultItem: RadioMenuItemProps['items'];
  positioning: CreateMenuProps['positioning'];
};

export type MenuItemProps = {
  children: Snippet;
  /**
   * Renders inside of a flex before the children.
   */
  start?: Snippet;
  /**
   * Renders inside of a flex after the children.
   */
  end?: Snippet;
  isLoading?: boolean;
  isDisabled?: boolean;
  /**
   * Size of the button.
   * @default md
   */
  size?: 'sm' | 'md' | 'lg';
  href?: string;
} & HTMLButtonAttributes;
