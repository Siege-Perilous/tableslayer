import type { Placement } from '@floating-ui/dom';
import type { Snippet } from 'svelte';
import type { HTMLBaseAttributes } from 'svelte/elements';

export type AvatarProps = {
  src?: string;
  alt?: string;
  initials?: string;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'round' | 'square';
} & HTMLBaseAttributes;

export type AvatarPopoverPositioning = {
  placement?: Placement;
  offset?: number;
};

export type AvatarPopoverProps = {
  src: AvatarProps['src'];
  size?: AvatarProps['size'];
  content: Snippet;
  positioning?: AvatarPopoverPositioning;
};

export type AvatarFileInputProps = AvatarProps & {
  files?: FileList | null;
  onChange?: () => void;
};
