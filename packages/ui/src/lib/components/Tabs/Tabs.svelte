<script lang="ts">
  import { Icon } from '../Icon';
  import type { Tab, TabsProps } from './types';

  let {
    tabs,
    selected = $bindable(),
    onSelectedChange,
    variant = 'underline',
    size = 'md',
    children,
    ...restProps
  }: TabsProps = $props();

  const uid = $props.id();
  const tabId = (id: string) => `${uid}-tab-${id}`;
  const panelId = `${uid}-panel`;
  let list = $state<HTMLElement | null>(null);

  const select = (tab: Tab) => {
    if (tab.isDisabled || tab.id === selected) return;
    selected = tab.id;
    onSelectedChange?.(tab.id);
  };

  /** Arrow keys move along the row and take the tab they land on, as a row of tabs is expected to. */
  const onkeydown = (event: KeyboardEvent) => {
    const open = tabs.filter((tab) => !tab.isDisabled);
    const at = open.findIndex((tab) => tab.id === selected);
    let to: Tab | undefined;
    if (event.key === 'ArrowRight') to = open[(at + 1) % open.length];
    else if (event.key === 'ArrowLeft') to = open[(at - 1 + open.length) % open.length];
    else if (event.key === 'Home') to = open[0];
    else if (event.key === 'End') to = open[open.length - 1];
    if (!to) return;
    event.preventDefault();
    const element = list?.querySelector<HTMLElement>(`#${CSS.escape(tabId(to.id))}`);
    element?.focus();
    // A link is followed by its own click; anything else is selected at once.
    if (to.href) element?.click();
    else select(to);
  };

  const classes = $derived(['tabs', `tabs--${variant}`, `tabs--${size}`, restProps.class ?? '']);
</script>

<!--
@component
  ## Tabs

  A row of tabs, one of them selected. With `children` it shows what the selected tab holds;
  without, it is only the row, for a page that switches something of its own. A tab with an
  `href` is a link.

  @example
  ```svelte
  <Tabs
    tabs={[
      { id: 'terrain', label: 'Terrain' },
      { id: 'hexsides', label: 'Hexsides', badge: 12 }
    ]}
    bind:selected
  >
    {#snippet children({ selected })}
      {#if selected === 'terrain'}…{/if}
    {/snippet}
  </Tabs>
  ```
-->
<div {...restProps} class={classes}>
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div bind:this={list} class="tabs__list" role="tablist" {onkeydown}>
    {#each tabs as tab (tab.id)}
      <svelte:element
        this={tab.href && !tab.isDisabled ? 'a' : 'button'}
        id={tabId(tab.id)}
        class={['tabs__tab', tab.id === selected && 'tabs__tab--isSelected', tab.isDisabled && 'tabs__tab--isDisabled']}
        role="tab"
        href={tab.href && !tab.isDisabled ? tab.href : undefined}
        type={tab.href && !tab.isDisabled ? undefined : 'button'}
        aria-selected={tab.id === selected}
        aria-controls={children ? panelId : undefined}
        aria-disabled={tab.isDisabled}
        disabled={tab.href ? undefined : tab.isDisabled}
        tabindex={tab.id === selected ? 0 : -1}
        onclick={() => select(tab)}
      >
        {#if tab.icon}
          <Icon Icon={tab.icon} size={size === 'sm' ? '0.875rem' : '1rem'} />
        {/if}
        <span class="tabs__label">{tab.label}</span>
        {#if tab.badge !== undefined}
          <span class="tabs__badge">{tab.badge}</span>
        {/if}
      </svelte:element>
    {/each}
  </div>
  {#if children}
    <div id={panelId} class="tabs__panel" role="tabpanel" aria-labelledby={tabId(selected)}>
      {@render children({ selected })}
    </div>
  {/if}
</div>

<style>
  .tabs {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .tabs__list {
    display: flex;
    flex: none;
    align-items: stretch;
    gap: 0.25rem;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs--underline .tabs__list {
    border-bottom: var(--borderThin);
  }
  .tabs--segmented .tabs__list {
    align-self: flex-start;
    gap: 0;
    padding: 0.125rem;
    background: var(--contrastLow);
    border-radius: var(--radius-2);
  }

  .tabs__tab {
    display: flex;
    align-items: center;
    flex: none;
    gap: 0.375rem;
    height: 2rem;
    padding: 0 0.625rem;
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--fgMuted);
    text-decoration: none;
    white-space: nowrap;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .tabs--sm .tabs__tab {
    height: 1.5rem;
    padding: 0 0.5rem;
    font-size: 0.75rem;
  }
  .tabs__tab:hover {
    color: var(--fg);
  }
  .tabs__tab:focus-visible {
    outline: 2px solid var(--fg);
    outline-offset: -2px;
  }
  .tabs__tab--isSelected {
    color: var(--fg);
  }
  .tabs__tab--isDisabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tabs--underline .tabs__tab {
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;
  }
  .tabs--underline .tabs__tab--isSelected {
    border-bottom-color: var(--fgPrimary);
  }

  .tabs--segmented .tabs__tab {
    border-radius: var(--radius-1);
  }
  .tabs--segmented .tabs__tab--isSelected {
    background: var(--bg);
    box-shadow: var(--shadow-1);
  }

  .tabs__badge {
    min-width: 1.125rem;
    padding: 0 0.3125rem;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    line-height: 1.125rem;
    text-align: center;
    color: var(--fgMuted);
    background: var(--contrastLow);
    border-radius: 999px;
  }
  .tabs--segmented .tabs__badge {
    background: var(--contrastMedium);
  }

  .tabs__panel {
    flex: 1;
    min-height: 0;
  }
</style>
