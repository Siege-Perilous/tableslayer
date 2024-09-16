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
    --btn-bg: var(--gray-100);
    --btn-bgHover: var(--gray-200);
    --btn-border: solid 1px var(--gray-300);
    --btn-borderHover: solid 1px var(--gray-400);
    --btn-color: var(--gray-900);
  }

  :global(.dark) {
    color-scheme: dark;
    --btn-bg: var(--gray-950);
    --btn-bgHover: var(--gray-900);
    --btn-border: solid 1px var(--gray-800);
    --btn-borderHover: solid 1px var(--gray-700);
    --btn-color: var(--gray-50);
  }

  .btn {
    color: var(--btn-color);
    background-color: var(--btn-bg);
    padding: 0 var(--size-2);
    border-radius: var(--radius-1);
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
    font-size: var(--font-size-1);
    height: var(--size-6);
  }
  .btn--lg {
    font-size: var(--font-size-2);
    height: var(--size-8);
  }

  .btn:hover {
    background-color: (--btn-bgHover);
    border: var(--btn-borderHover);
  }
</style>
