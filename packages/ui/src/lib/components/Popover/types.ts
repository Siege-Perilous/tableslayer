import type { Placement } from '@floating-ui/dom';
import type { Snippet } from 'svelte';

export type PopoverPositioning = {
  placement?: Placement;
  offset?: number;
};

export type PopoverProps = {
  isOpen?: boolean;
  onIsOpenChange?: (open: boolean) => void;
  trigger: Snippet;
  triggerClass?: string;
  triggerTestId?: string;
  contentClass?: string;
  positioning?: PopoverPositioning;
  portal?: string | null;
  closeOnOutsideClick?: boolean;
  content: Snippet<
    [
      {
        contentProps: {
          close: () => void;
        };
      }
    ]
  >;
};
