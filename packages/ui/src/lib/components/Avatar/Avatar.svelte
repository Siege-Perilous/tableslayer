<script lang="ts">
  import type { AvatarProps } from './types';
  let { src, alt, initials, variant = 'round', size = 'sm', isLoading, ...restProps }: AvatarProps = $props();
  import { createAvatar, melt } from '@melt-ui/svelte';

  let avatarClasses = $derived([
    'avatar',
    `avatar--${size}`,
    isLoading && 'isLoading',
    `avatar--${variant}`,
    restProps.class
  ]);

  const {
    elements: { fallback }
  } = createAvatar({
    src: src || ''
  });
</script>

<div class={avatarClasses}>
  <img {src} {alt} class="avatar__image" />
  <span use:melt={$fallback} class="avatar__text">{initials}</span>
</div>

<style>
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--fg);
    color: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--fg);
  }
  .avatar--round {
    border-radius: 50%;
  }
  .avatar--square {
    border-radius: var(--radius-2);
    .avatar__image {
      border-radius: var(--radius-2);
    }
  }
  .avatar--sm {
    width: 1.5rem;
    height: 1.5rem;
    min-width: 1.5rem;
    min-height: 1.5rem;
    font-size: 0.875rem;
  }
  .avatar--md {
    width: 2rem;
    height: 2rem;
    min-width: 2rem;
    min-height: 2rem;
    font-size: var(--font-size-4);
  }
  .avatar--lg {
    width: 2.5rem;
    height: 2.5rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
  }
  .avatar--xl {
    width: 8rem;
    height: 8rem;
    min-width: 8rem;
    min-height: 8rem;
  }
  .avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .avatar__text {
    font-weight: var(--font-weight-6);
  }
</style>
