<script lang="ts">
  import classNames from 'classnames';
  import type { AvatarProps } from './types';
  let { src, alt, initials, size = 'sm', isLoading }: AvatarProps = $props();
  import { createAvatar, melt } from '@melt-ui/svelte';

  const avatarClasses = classNames('avatar', `avatar--${size}`, isLoading && 'isLoading');

  const {
    elements: { image, fallback }
  } = createAvatar({
    src: src || ''
  });
</script>

<div class={avatarClasses}>
  <img use:melt={$image} {alt} class="avatar__image" />
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
  .avatar--sm {
    width: var(--size-6);
    height: var(--size-6);
  }
  .avatar--md {
    width: var(--size-8);
    height: var(--size-8);
    font-size: var(--font-size-4);
  }
  .avatar--lg {
    width: var(--size-9);
    height: var(--size-9);
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
