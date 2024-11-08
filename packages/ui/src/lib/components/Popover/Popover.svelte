<script lang="ts">
  import { createPopover, createSync, melt } from '@melt-ui/svelte';
  import { fade } from 'svelte/transition';
  import type { PopoverProps } from './types';
  import classNames from 'classnames';
  import type { HTMLBaseAttributes } from 'svelte/elements';

  let {
    isOpen = false,
    trigger,
    content,
    positioning = { placement: 'bottom' },
    portal = null,
    forceVisible,
    closeOnOutsideClick = true,
    ...restProps
  }: PopoverProps & HTMLBaseAttributes = $props();

  console.log('positioning', positioning);

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
</script>

<button type="button" class="popTrigger" use:melt={$triggerAction} aria-label="Update dimensions">
  {@render trigger()}
</button>

{#if isOpen}
  <div
    use:melt={$contentAction}
    transition:fade={{ duration: 100 }}
    class={classNames('popContent', ...(restProps.class ?? ''))}
  >
    {@render content()}
    <button class="popClose" use:melt={$close}> close </button>
  </div>
{/if}

<style>
  .popTrigger {
    cursor: pointer;
  }
  .popContent {
    padding: var(--size-1) var(--size-2);
    background: var(--bg);
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
