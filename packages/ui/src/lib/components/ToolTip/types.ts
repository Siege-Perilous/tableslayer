import type { Snippet } from 'svelte';
export type ToolTipProps = {
  children: Snippet;
  positioning?: {
    placement: 'top' | 'right' | 'bottom' | 'left';
  };
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
  closeOnPointerDown?: boolean;
  forceVisible?: boolean;
  toolTipContent: Snippet;
};
