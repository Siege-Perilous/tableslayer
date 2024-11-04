<script lang="ts" module>
  import type { ToastDataProps } from './types';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import classNames from 'classnames';
  import { IconX } from '@tabler/icons-svelte';
  import { Icon } from '../';
  const {
    elements: { content, title, description, close },
    helpers,
    states: { toasts },
    actions: { portal }
  } = createToaster<ToastDataProps>({ hover: 'pause-all' });

  let isHovered = $state(false);
  let leaveTimeout: ReturnType<typeof setTimeout>;

  const handleMouseEnter = () => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
    }
    isHovered = true;
  };

  const handleMouseLeave = () => {
    leaveTimeout = setTimeout(() => {
      isHovered = false;
    }, 1000);
  };

  export const addToast = helpers.addToast;
</script>

<script lang="ts">
  import { createToaster, melt } from '@melt-ui/svelte';
</script>

<div
  use:portal
  role="alert"
  class={classNames('toasts', isHovered && 'toasts--isHovered')}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  {#each $toasts as { id, data }, index (id)}
    <div
      use:melt={$content(id)}
      animate:flip={{ duration: 500 }}
      in:fly={{ duration: 150, y: '100%' }}
      out:fly={{ duration: 150, y: '100%' }}
      data-testid="toast"
      class="toast"
      style="z-index: index; visibility: {index > $toasts.length - 6 || isHovered
        ? 'visible'
        : 'hidden'} ; transform: {index === $toasts.length - 1 || isHovered
        ? 'scale(1) translateY(0)'
        : `scale(${1 - 0.05 * ($toasts.length - 1 - index)}) translateY(${-12 * ($toasts.length - 1 - index)}px)`};"
    >
      <div>
        <div class="toast__title">
          <p use:melt={$title(id)} class="toast__titleText">
            {data.title}
          </p>
          <div class={classNames('toast__titleDot', `toast__titleDot--${data.type}`)}></div>
        </div>
        {#if data.body}
          <div use:melt={$description(id)}>
            {data.body}
          </div>
        {/if}
      </div>
      <button use:melt={$close(id)} aria-label="Close notification"><Icon Icon={IconX} /></button>
    </div>
  {/each}
</div>

<style>
  :global(.light) {
    --toastDotSuccess: var(--green-200);
    --toastDotDanger: var(--yellow-200);
  }
  :global(.dark) {
    --toastDotSuccess: var(--green-600);
    --toastDotDanger: var(--yellow-600);
  }
  .toasts {
    display: flex;
    flex-direction: column;
    gap: var(--size-2); /* Reduced gap to allow overlapping look */
    width: 300px;
    position: fixed;
    right: var(--size-8);
    bottom: var(--size-8);
  }
  .toast {
    position: fixed;
    right: var(--size-8);
    bottom: var(--size-8);
    display: flex;
    justify-content: space-between;
    align-items: start;
    background: var(--fg);
    color: var(--bg);
    gap: var(--size-2);
    width: 300px;
    padding: var(--size-2);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-2);
    border: 1px solid var(--bg);
    transition:
      transform 0.3s ease-in-out,
      opacity 0.3s ease-in-out;
  }
  .toast__title {
    display: flex;
    align-items: start;
    gap: var(--size-2);
  }
  .toast__titleText {
    font-weight: var(--font-weight-6);
  }
  .toasts.toasts--isHovered .toast {
    position: static;
    transition: none;
  }
  .toast__titleDot {
    width: var(--size-2);
    height: var(--size-2);
    min-width: var(--size-2);
    min-height: var(--size-2);
    margin-top: var(--size-1);
    border-radius: 50%;
  }

  .toast__titleDot--info {
    background: var(--contrastHigh);
  }
  .toast__titleDot--success {
    background: var(--toastDotSuccess);
  }
  .toast__titleDot--danger {
    background: var(--toastDotDanger);
  }
</style>
