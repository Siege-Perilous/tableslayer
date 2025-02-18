<script lang="ts">
  import { createPopover, createSync, melt } from '@melt-ui/svelte';
  import { fade } from 'svelte/transition';
  import type { PopoverProps } from './types';
  import type { HTMLBaseAttributes } from 'svelte/elements';

  let {
    isOpen = false,
    trigger,
    content,
    triggerClass,
    contentClass,
    positioning = { placement: 'bottom' },
    portal = null,
    forceVisible,
    closeOnOutsideClick = true,
    ...restProps
  }: PopoverProps & HTMLBaseAttributes = $props();

  const {
    elements: { trigger: triggerAction, content: contentAction, close },
    states
  } = createPopover({
    positioning,
    forceVisible,
    portal,
    closeOnOutsideClick
  });

  const sync = createSync(states);

  $effect(() => {
    sync.open(isOpen, (v) => (isOpen = v));
  });

  const contentProps = {
    close: () => {
      isOpen = false;
    }
  };
</script>

<button
  type="button"
  class={['popTrigger', triggerClass ?? '']}
  use:melt={$triggerAction}
  aria-label="Update dimensions"
>
  {@render trigger()}
</button>

{#if isOpen}
  <div use:melt={$contentAction} transition:fade={{ duration: 100 }} class={['popContent', contentClass ?? '']}>
    {@render content({ contentProps })}
    <button class="popClose" use:melt={$close}> close </button>
  </div>
{/if}

<style>
  .popTrigger {
    cursor: pointer;
  }
  .popContent {
    padding: var(--size-2);
    background: var(--popoverBg);
    color: var(--fg);
    border: var(--borderThin);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-1);
    z-index: 1000;
  }
  /* TODO: Maybe I should use this */
  .popClose {
    display: none;
  }
</style>
