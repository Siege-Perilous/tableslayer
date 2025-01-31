import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes, SvelteHTMLElements } from 'svelte/elements';

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
  as?: keyof SvelteHTMLElements;
  /**
   * Size of the button.
   * @default md
   */
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost' | 'danger' | 'link';
  href?: string;
};

export type ButtonProps = (_ButtonProps & HTMLButtonAttributes) | (_ButtonProps & HTMLAnchorAttributes);

export type _IconButtonProps = {
  children: Snippet;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost' | 'danger' | 'link';
  href?: string;
  as?: keyof SvelteHTMLElements;
};

export type IconButtonProps = (_IconButtonProps & HTMLButtonAttributes) | (_IconButtonProps & HTMLAnchorAttributes);

export type ConfirmActionButtonProps = {
  trigger: Snippet<[{ triggerProps: { onclick: (e: Event) => void } }]>;
  actionMessage: Snippet;
  action: (e: Event) => void;
  actionButtonText?: string;
};
