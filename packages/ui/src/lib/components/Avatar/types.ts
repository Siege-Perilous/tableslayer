import type { Snippet } from 'svelte';
import type { HTMLBaseAttributes } from 'svelte/elements';

export type AvatarProps = {
  src?: string;
  alt?: string;
  initials?: string;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
} & HTMLBaseAttributes;

export type AvatarPopoverProps = {
  src: AvatarProps['src'];
  size?: AvatarProps['size'];
  content: Snippet;
};
