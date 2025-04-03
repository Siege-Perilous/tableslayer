<script lang="ts">
  import { computePosition, offset, flip, shift, platform } from '@floating-ui/dom';
  import { Button, type ConfirmActionButtonProps } from './';
  import { onDestroy, tick } from 'svelte';

  let {
    trigger,
    actionMessage,
    actionButtonText = 'Confirm delete',
    action,
    isLoading,
    positioning = { placement: 'bottom' },
    ...restProps
  }: ConfirmActionButtonProps = $props();

  let triggerElement: HTMLElement | null = null;
  let popoverElement = $state<HTMLElement | null>(null);
  let isShowingConfirm = $state(false);
  let floatingStyles = $state('');

  const toggleShowConfirm = async () => {
    isShowingConfirm = true;
    await tick();
    updatePosition();
  };

  const triggerProps = {
    onclick: () => {
      toggleShowConfirm();
    }
  };

  function updatePosition() {
    if (!triggerElement || !popoverElement) {
      return;
    }

    computePosition(triggerElement, popoverElement, {
      placement: positioning?.placement,
      middleware: [offset(({ rects }) => -rects.reference.height / 2 - rects.floating.height / 2), flip(), shift()],
      platform
    })
      .then(({ x, y, strategy }) => {
        floatingStyles = `position: ${strategy}; left: ${x}px; top: ${y}px;`;
      })
      .catch((error) => {
        console.error('Error in computePosition:', error);
      });
  }

  const handleGlobalClick = (e: MouseEvent) => {
    if (isShowingConfirm && popoverElement && triggerElement) {
      const target = e.target as Node;
      if (!popoverElement.contains(target) && !triggerElement.contains(target)) {
        isShowingConfirm = false;
      }
    }
  };

  onDestroy(() => {
    // Cleanup if needed
  });
</script>

<svelte:window onclick={handleGlobalClick} />

<div class="confirmAction" bind:this={triggerElement} {...restProps}>
  {@render trigger({ triggerProps })}
</div>

{#if isShowingConfirm}
  <div bind:this={popoverElement} class="confirmAction__content" style={floatingStyles}>
    {@render actionMessage()}
    <div class="confirmAction__buttons">
      <Button onclick={action} variant="danger" {isLoading}>
        {actionButtonText}
      </Button>
      <Button onclick={() => (isShowingConfirm = false)} variant="ghost">Cancel</Button>
    </div>
  </div>
{/if}

<style>
  .confirmAction {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .confirmAction__content {
    background-color: var(--popoverBg);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
    padding: 1rem;
    z-index: 1000;
    border: var(--borderThin);
  }
  .confirmAction__buttons {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
  }
</style>
