import type { CreatePopoverProps } from '@melt-ui/svelte';
import type { Snippet } from 'svelte';
export type PopoverProps = {
  isOpen?: boolean;
  onIsOpenChange?: (open: boolean) => void;
  trigger: Snippet;
  triggerClass?: string;
  contentClass?: string;
  content: Snippet<
    [
      {
        contentProps: {
          close: () => void;
        };
      }
    ]
  >;
} & CreatePopoverProps;
