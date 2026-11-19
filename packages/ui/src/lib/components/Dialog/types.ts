import type { Snippet } from 'svelte';
import type { HTMLDialogAttributes } from 'svelte/elements';

export type DialogProps = {
  isOpen?: boolean;
  onIsOpenChange?: (open: boolean) => void;
  /** The heading. Left out, the dialog must be named some other way (`aria-label`). */
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Whether a click on the dimmed page behind closes it. Escape always does. */
  closeOnOutsideClick?: boolean;
  /** Whether the heading has a button that closes it. */
  hasCloseButton?: boolean;
  children: Snippet<[{ close: () => void }]>;
  /** A row of buttons along the foot. */
  footer?: Snippet<[{ close: () => void }]>;
} & Omit<HTMLDialogAttributes, 'children' | 'open' | 'title'>;
