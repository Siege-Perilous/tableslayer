<script lang="ts">
  import type { TitleProps } from './types';
  let { children, as = 'p', size, style, ...restProps }: TitleProps = $props();
  let titleClasses = $derived(['title', `title-${size}`, restProps.class ?? '']);
</script>

<svelte:element this={as} {...restProps} class={titleClasses} {style}>
  {@render children()}
</svelte:element>

<style>
  .title {
    font-family: var(--font-serif);
    font-variation-settings:
      'wght' 600,
      'TAIL' 100,
      'ROUN' 50;
  }

  .title-xs {
    font-size: 1.25rem;
  }

  .title-sm {
    font-size: 1.5rem;
  }

  .title-md {
    font-size: 2.5rem;
  }

  .title-lg {
    font-size: 3rem;
  }

  .title-xl {
    font-size: 4.5rem;
    font-feature-settings: 'ss03' 1;
  }
  @media (max-width: 768px) {
    .title-lg {
      font-size: 1.25rem;
    }
    .title-md {
      font-size: 1.25rem;
    }
    .title-sm {
      font-size: 1.25rem;
    }
    .title-xl {
      font-size: 1.25rem;
    }
  }
</style>
