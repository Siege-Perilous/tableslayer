import type { FloatingConfig } from '@melt-ui/svelte/internal/actions';
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

export type AvatarPopoverProps = {
  src: AvatarProps['src'];
  size?: AvatarProps['size'];
  content: Snippet;
  positioning?: FloatingConfig;
};

export type AvatarFileInputProps = AvatarProps & {
  files?: FileList | null;
};
