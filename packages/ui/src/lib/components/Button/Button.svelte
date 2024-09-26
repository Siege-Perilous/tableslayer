<script lang="ts">
  import type { ButtonProps } from './types';
  import { Loader } from '../Loading';
  import classNames from 'classnames';
  /* @type {ButtonProps} */
  let {
    children,
    start,
    end,
    isLoading = false,
    isDisabled = false,
    size = 'md',
    variant = 'primary',
    ...restProps
  }: ButtonProps = $props();

  const btnClasses = classNames(
    'btn',
    `btn--${size}`,
    isLoading && 'btn-isLoading',
    isDisabled && 'btn--isDisabled',
    `btn--${variant}`,
    restProps.class ?? ''
  );

  const component = variant === 'link' ? 'a' : 'button';
</script>

<!--
@component
  ## Button

  Button component is used to trigger an action or event.

  @example
  ```svelte
  <Button>
    {#snippet start()}
      <Icon Icon={IconCheck} />
    {/snippet}
    Primary
  </Button>
  ```
  @props
  - `variant` - The variant of the button. Default is `primary`.
  - `size` - The size of the button. Default is `md`.
  - `isLoading` - The loading state of the button. Default is `false`.
  - `isDisabled` - The disabled state of the button. Default is `false`.
  - `start` - The start snippet of the button.
  - `end` - The end snippet of the button.
-->

<svelte:element this={component} class={btnClasses} disabled={isDisabled} {...restProps}>
  {#if isLoading}
    <Loader />
  {/if}
  {#if start}
    {@render start()}
  {/if}
  {@render children()}
  {#if end}
    {@render end()}
  {/if}
</svelte:element>

<style>
  :global(.light) {
    color-scheme: light;
    --btn-bg: var(--contrastEmpty);
    --btn-bgHover: var(--primary-50);
    --btn-border: solid 2px var(--fg);
    --btn-borderHover: solid 2px var(--primary-600);
    --btn-color: var(--fg);
    --btn-dangerStripesHover: var(--primary-300);
  }

  :global(.dark) {
    color-scheme: dark;
    --btn-bg: var(--bg);
    --btn-bgHover: var(--primary-950);
    --btn-border: solid 2px var(--fg);
    --btn-borderHover: solid 2px var(--primary-500);
    --btn-color: var(--fg);
    --btn-dangerStripesHover: var(--primary-700);
  }

  .btn {
    color: var(--btn-color);
    background-color: var(--btn-bg);
    padding: 0 var(--size-2);
    border-radius: var(--radius-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    cursor: pointer;
    font-weight: var(--font-weight-5);
    border: var(--btn-border);
    border-color: transparent;
    font-weight: var(--font-weight-6);
  }

  .btn--sm {
    font-size: var(--font-size-1);
    height: var(--size-6);
  }
  .btn--md {
    font-size: var(--font-size-1);
    height: var(--size-8);
  }
  .btn--lg {
    font-size: var(--font-size-2);
    height: var(--size-9);
  }

  .btn--primary {
    border-color: var(--fg);
  }
  .btn--danger {
    border-color: var(--fg);
    background-image: linear-gradient(
      135deg,
      transparent 10%,
      transparent 10%,
      transparent 50%,
      color-mix(in srgb, var(--fg), transparent 40%) 50%,
      color-mix(in srgb, var(--fg), transparent 40%) 50%,
      transparent 60%,
      transparent 100%
    );
    background-size: 14.14px 14.14px;
    text-shadow: 0 0 4px var(--bg);
  }
  .btn--danger:hover {
    background-image: linear-gradient(
      135deg,
      transparent 10%,
      transparent 10%,
      transparent 50%,
      var(--btn-dangerStripesHover),
      var(--btn-dangerStripesHover),
      transparent 60%,
      transparent 100%
    );
  }
  .btn:hover {
    background-color: var(--btn-bgHover);
    border: var(--btn-borderHover);
  }
  .btn--isDisabled {
    cursor: pointer;
  }
  .btn--ghost {
    background: none;
    border-color: transparent;
  }
  .btn--link {
    background: none;
    border-color: transparent;
    color: var(--textPrimary);
  }
  .btn--link:hover {
    background: none;
    border-color: transparent;
    text-decoration: underline;
  }
</style>
