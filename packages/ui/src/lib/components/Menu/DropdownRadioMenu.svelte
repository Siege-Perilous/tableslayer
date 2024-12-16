<script lang="ts">
  import { createDropdownMenu, melt } from '@melt-ui/svelte';
  import type { RadioMenuProps, RadioMenuItem } from './types';
  import { fly } from 'svelte/transition';
  let {
    trigger,
    items,
    footer,
    defaultItem,
    value,
    onValueChange,
    positioning = { placement: 'bottom' }
  }: RadioMenuProps = $props();
  import { goto } from '$app/navigation';
  import { Icon } from '../';

  const {
    elements: { trigger: triggerAction, menu: menuAction },
    builders: { createMenuRadioGroup },
    states: { open }
  } = createDropdownMenu({
    loop: true,
    positioning: positioning
  });

  const {
    elements: { radioGroup, radioItem },
    helpers: { isChecked }
  } = createMenuRadioGroup({
    defaultValue: defaultItem.value,
    // @ts-expect-error typing issue with unknown type
    onValueChange,
    value
  });

  const handleItemClick = (item: RadioMenuItem) => {
    if (item.href) {
      goto(item.href);
    }
    if (item.onclick) {
      item.onclick();
    }
  };

  const handleClose = () => {
    open.set(false);
  };
</script>

<button type="button" class="menuTrigger" use:melt={$triggerAction} aria-label="Menu" data-testid="menuButton">
  {@render trigger()}
</button>

{#if $open}
  <div class="menu" use:melt={$menuAction} transition:fly={{ duration: 50 }}>
    <div use:melt={$radioGroup}>
      {#each items as item}
        <button
          class="menuItem"
          use:melt={$radioItem({ value: item.value })}
          onclick={() => handleItemClick(item)}
          data-testid="menuItem"
        >
          <div class="menuSpace">
            {#if $isChecked(item.value)}
              <div class="menuDot"></div>
            {/if}
          </div>
          {#if item.icon}
            <Icon Icon={item.icon} size="1.5rem" />
          {/if}
          {item.label}
        </button>
      {/each}
    </div>
    {#if footer}
      <div class="menuFooter">
        {@render footer({ close: handleClose })}
      </div>
    {/if}
  </div>
{/if}

<style>
  :global(.light) {
    --menuItemHover: var(--primary-50);
    --menuItemBorderHover: solid 2px var(--primary-600);
  }
  :global(.dark) {
    --menuItemHover: var(--primary-950);
    --menuItemBorderHover: solid 2px var(--primary-500);
  }
  .menu {
    padding: var(--size-2);
    background: var(--bg);
    color: var(--fg);
    border: var(--borderThin);
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-1);
    z-index: 1000;
  }
  .menuTrigger {
    cursor: pointer;
  }
  .menuItem {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: var(--size-1) var(--size-4);
    gap: var(--size-4);
    border-radius: var(--radius-1);
    width: 100%;
    border: solid 2px transparent;
  }
  .menuItem:hover {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
  .menuSpace {
    width: var(--size-2);
    height: var(--size-2);
  }
  .menuDot {
    width: var(--size-2);
    height: var(--size-2);
    background: var(--fgPrimary);
    border-radius: 50%;
  }
  .menuFooter {
    margin-top: 0.25rem;
    border-top: var(--borderThin);
    padding-top: 0.5rem;
  }
</style>
