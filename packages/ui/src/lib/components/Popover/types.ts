import type { CreatePopoverProps } from '@melt-ui/svelte';
import type { Snippet } from 'svelte';
export type PopoverProps = {
  isOpen?: boolean;
  trigger: Snippet;
  content: Snippet;
} & CreatePopoverProps;
