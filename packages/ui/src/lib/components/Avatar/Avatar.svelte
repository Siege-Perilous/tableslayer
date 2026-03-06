<script lang="ts">
  import type { AvatarProps } from './types';
  let { src, alt, initials, variant = 'round', size = 'sm', isLoading, ...restProps }: AvatarProps = $props();

  let imageLoaded = $state(false);
  let imageError = $state(false);

  let showFallback = $derived(!src || imageError || !imageLoaded);

  let avatarClasses = $derived([
    'avatar',
    `avatar--${size}`,
    isLoading && 'isLoading',
    `avatar--${variant}`,
    restProps.class
  ]);

  $effect(() => {
    // Reset state when src changes
    if (src) {
      imageLoaded = false;
      imageError = false;
    }
  });

  const handleLoad = () => {
    imageLoaded = true;
  };

  const handleError = () => {
    imageError = true;
  };
</script>

<div class={avatarClasses}>
  {#if src && !imageError}
    <img
      {src}
      {alt}
      class="avatar__image"
      class:avatar__image--hidden={!imageLoaded}
      onload={handleLoad}
      onerror={handleError}
    />
  {/if}
  {#if showFallback}
    <span class="avatar__text">{initials}</span>
  {/if}
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
    width: 5rem;
    height: 5rem;
    min-width: 5rem;
    min-height: 5rem;
  }
  .avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .avatar__image--hidden {
    display: none;
  }
  .avatar__text {
    font-weight: var(--font-weight-6);
  }
</style>
