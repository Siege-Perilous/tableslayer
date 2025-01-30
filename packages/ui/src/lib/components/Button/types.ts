import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

export type _ButtonProps = {
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
  variant?: 'primary' | 'ghost' | 'danger' | 'link';
  href?: string;
};

export type ButtonProps = (_ButtonProps & HTMLButtonAttributes) | (_ButtonProps & HTMLAnchorAttributes);

export type IconButtonProps = {
  children: Snippet;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost' | 'danger' | 'link';
  href?: string;
} & HTMLButtonAttributes;

export type ConfirmActionButtonProps = {
  trigger: Snippet<[{ triggerProps: { onclick: (e: Event) => void } }]>;
  actionMessage: Snippet;
  action: (e: Event) => void;
  actionButtonText?: string;
};
