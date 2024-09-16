<script lang="ts">
  interface AvatarProps {
    src?: string;
    alt?: string;
    initials?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  let { src, alt, initials, size = 'sm', className }: AvatarProps = $props();
  import { createAvatar, melt } from '@melt-ui/svelte';

  const {
    elements: { image, fallback }
  } = createAvatar({
    src: src || 'https://avatars.githubusercontent.com/u/1162160?v=4'
  });
</script>

<div class={`avatar avatar--${size} ${className}`}>
  <img use:melt={$image} {alt} class="avatar__image" />
  <span use:melt={$fallback} class="text-3xl font-medium text-magnum-700">{initials}</span>
</div>

<style>
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: red;
  }
  .avatar--sm {
    width: 32px;
    height: 32px;
  }
  .avatar--md {
    width: 40px;
    height: 40px;
  }
  .avatar--lg {
    width: 48px;
    height: 48px;
  }
  .avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
</style>
