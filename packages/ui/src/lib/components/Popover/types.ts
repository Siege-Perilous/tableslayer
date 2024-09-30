import type { Snippet } from 'svelte';
export type PopoverProps = {
  isOpen?: boolean;
  trigger: Snippet;
  content: Snippet;
  positioning?: {
    placement: 'top' | 'right' | 'bottom' | 'left';
  };
};
