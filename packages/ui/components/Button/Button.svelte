<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import classNames from 'classnames';

  export type ButtonProps = {
    children: Snippet;
    start?: Snippet;
    end?: Snippet;
    isLoading?: boolean;
    isDisabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
  } & HTMLButtonAttributes;
</script>

<script lang="ts">
  let {
    children,
    start,
    end,
    isLoading = false,
    isDisabled = false,
    size = 'md',
    ...restProps
  }: ButtonProps = $props();

  const btnClasses = classNames('btn', `btn--${size}`, isLoading && 'isLoading');
</script>

<button class={btnClasses} disabled={isDisabled} {...restProps}>
  {#if isLoading}
    <span>Loading...</span>
  {/if}
  {#if start}
    {@render start()}
  {/if}
  {@render children()}
  {#if end}
    {@render end()}
  {/if}
</button>

<style>
  :global(.light) {
    color-scheme: light;
    --btn-bg: var(--gray-2);
    --btn-bgHover: var(--gray-3);
    --btn-border: solid 1px var(--gray-3);
    --btn-borderHover: solid 1px var(--gray-4);
    --btn-color: var(--gray-9);
  }

  :global(.dark) {
    color-scheme: dark;
    --btn-bg: var(--gray-9);
    --btn-bgHover: var(--gray-8);
    --btn-border: solid 1px var(--gray-8);
    --btn-borderHover: solid 1px var(--gray-7);
    --btn-color: var(--gray-1);
  }

  .btn {
    color: var(--btn-color);
    background-color: var(--btn-bg);
    padding: 0 var(--size-2);
    border-radius: var(--radius-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: var(--btn-border);
    cursor: pointer;
  }

  .btn--sm {
    font-size: var(--font-size-1);
    height: var(--size-6);
  }
  .btn--md {
    font-size: var(--font-size-2);
    height: var(--size-7);
  }
  .btn--lg {
    font-size: var(--font-size-3);
    height: var(--size-8);
  }

  .btn:hover {
    background-color: var(--btn-bgHover);
    border: var(--btn-borderHover);
  }
</style>
