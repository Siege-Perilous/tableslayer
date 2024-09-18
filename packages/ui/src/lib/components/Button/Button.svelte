<script lang="ts">
  import type { ButtonProps } from './types';
  import classNames from 'classnames';
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
    --btn-bg: var(--bg);
    --btn-bgHover: var(--primary-50);
    --btn-border: solid 2px var(--fg);
    --btn-borderHover: solid 2px var(--primary-600);
    --btn-color: var(--fg);
  }

  :global(.dark) {
    color-scheme: dark;
    --btn-bg: var(--bg);
    --btn-bgHover: var(--primary-950);
    --btn-border: solid 2px var(--fg);
    --btn-borderHover: solid 2px var(--primary-500);
    --btn-color: var(--fg);
  }

  .btn {
    color: var(--btn-color);
    background-color: var(--btn-bg);
    padding: 0 var(--size-3);
    border-radius: var(--radius-4);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    cursor: pointer;
    font-weight: var(--font-weight-5);
    border: var(--btn-border);
    font-weight: var(--font-weight-6);
  }

  .btn--sm {
    font-size: var(--font-size-1);
    height: var(--size-6);
  }
  .btn--md {
    font-size: var(--font-size-1);
    height: var(--size-7);
  }
  .btn--lg {
    font-size: var(--font-size-2);
    height: var(--size-8);
  }

  .btn:hover {
    background-color: var(--btn-bgHover);
    border: var(--btn-borderHover);
  }
</style>
