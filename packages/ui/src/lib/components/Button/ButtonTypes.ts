import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';

export type ButtonProps = {
  children: Snippet;
  /**
   * Renders the children elements inside the button.
   * @default undefined
   */
  start?: Snippet;
  end?: Snippet;
  isLoading?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
} & HTMLButtonAttributes;
