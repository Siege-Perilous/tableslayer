<script lang="ts" module>
  export { addToast, removeToast } from './toastStore.svelte';
</script>

<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { IconX } from '@tabler/icons-svelte';
  import { Icon, Loader } from '../';
  import { page } from '$app/state';
  import { checkToastCookie } from './toastCookie';
  import { toastManager } from './toastStore.svelte';
  import { onMount, onDestroy } from 'svelte';

  let isHovered = $state(false);
  let leaveTimeout: ReturnType<typeof setTimeout>;
  let portalContainer: HTMLDivElement | null = null;
  let toastContainer = $state<HTMLDivElement | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
    }
    isHovered = true;
    toastManager.pauseAll();
  };

  const handleMouseLeave = () => {
    leaveTimeout = setTimeout(() => {
      isHovered = false;
      toastManager.resumeAll();
    }, 1000);
  };

  $effect(() => {
    if (page.url) {
      checkToastCookie();
    }
  });

  onMount(() => {
    portalContainer = document.createElement('div');
    portalContainer.id = 'toast-portal';
    portalContainer.style.position = 'fixed';
    portalContainer.style.bottom = '0';
    portalContainer.style.right = '0';
    portalContainer.style.zIndex = '9999';
    document.body.appendChild(portalContainer);

    if (toastContainer && portalContainer) {
      portalContainer.appendChild(toastContainer);
    }
  });

  onDestroy(() => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
    }
    if (portalContainer?.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
    }
  });

  $effect(() => {
    if (toastContainer && portalContainer && !portalContainer.contains(toastContainer)) {
      portalContainer.appendChild(toastContainer);
    }
  });
</script>

<div
  bind:this={toastContainer}
  role="alert"
  class={['toasts', isHovered && 'toasts--isHovered']}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  {#each toastManager.toasts as toast, index (toast.id)}
    <div
      animate:flip={{ duration: 500 }}
      in:fly={{ duration: 150, y: '100%' }}
      out:fly={{ duration: 150, y: '100%' }}
      data-testid="toast"
      class="toast"
      style="z-index: index; visibility: {index > toastManager.toasts.length - 6 || isHovered
        ? 'visible'
        : 'hidden'} ; transform: {index === toastManager.toasts.length - 1 || isHovered
        ? 'scale(1) translateY(0)'
        : `scale(${1 - 0.05 * (toastManager.toasts.length - 1 - index)}) translateY(${-12 * (toastManager.toasts.length - 1 - index)}px)`};"
    >
      <div>
        <div class="toast__title">
          <p class="toast__titleText">
            {toast.data.title}
          </p>
          {#if toast.data.type === 'loading'}
            <Loader />
          {:else}
            <div class={['toast__titleDot', `toast__titleDot--${toast.data.type}`]}></div>
          {/if}
        </div>
        {#if toast.data.body}
          <div>
            {toast.data.body}
          </div>
        {/if}
      </div>
      <button onclick={() => toastManager.removeToast(toast.id)} aria-label="Close notification">
        <Icon Icon={IconX} />
      </button>
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
    gap: var(--size-2);
    width: 300px;
    position: fixed;
    right: var(--size-8);
    bottom: var(--size-8);
    z-index: 2;
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
