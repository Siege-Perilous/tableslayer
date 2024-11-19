<script lang="ts">
  import { createSelect, melt } from '@melt-ui/svelte';
  import { IconChevronDown } from '@tabler/icons-svelte';
  import type { SelectProps } from '../';
  import { Icon } from '../';
  import classNames from 'classnames';

  let {
    options,
    positioning = {
      placement: 'bottom-start',
      fitViewport: true
    },
    defaultSelected,
    required,
    disabled,
    multiple = false,
    onSelectedChange,
    variant = 'default',
    ids,
    ...restProps
  }: SelectProps = $props();

  const {
    elements: { trigger, menu, option, group, groupLabel },
    states: { selectedLabel, open },
    helpers: { isSelected }
  } = createSelect({
    forceVisible: true,
    positioning,
    defaultSelected,
    multiple,
    required,
    disabled,
    portal: null,
    ids,
    onSelectedChange
  });

  const selectClasses = classNames('select', variant && `select--${variant}`);
</script>

<div {...restProps} class={selectClasses}>
  <button class="select__trigger" use:melt={$trigger} aria-label="Food">
    {$selectedLabel || 'Select'}
    <Icon Icon={IconChevronDown} />
  </button>
  {#if $open}
    <div class="select__menu" use:melt={$menu}>
      {#if Array.isArray(options)}
        {#each options as item}
          <div class="select__option" use:melt={$option({ value: item.value, label: item.label })}>
            <div class="select__space">
              {#if $isSelected(item.value)}
                <div class="select__dot"></div>
              {/if}
            </div>
            {item.label}
          </div>
        {/each}
      {:else}
        {#each Object.entries(options) as [key, arr]}
          <div class="select__group" use:melt={$group(key)}>
            <div class="select__group-label" use:melt={$groupLabel(key)}>
              {key}
            </div>
            {#each arr as item}
              <div
                class="select__option {$isSelected(item) ? 'select__option--selected' : ''}"
                use:melt={$option({ value: item.value, label: item.label })}
              >
                <div class="select__space">
                  {#if $isSelected(item.value)}
                    <div class="select__dot"></div>
                  {/if}
                </div>
                {item.label}
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .select {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }
  .select--transparent .select__trigger {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }

  .select__trigger {
    display: flex;
    gap: 0.5rem;
    height: var(--size-8);
    align-items: center;
    justify-content: space-between;
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    padding: 0 var(--size-3);
    background: var(--inputBg);
    cursor: pointer;
    &:focus-visible {
      outline: none;
      border-color: var(--fg);
      background: var(--inputFocusBg);
    }
  }

  [data-fs-error] {
    border-color: var(--fgDanger);
  }

  .select__menu {
    z-index: 10;
    display: flex;
    flex-direction: column;
    max-height: 300px;
    overflow-y: auto;
    padding: 0.25rem;
    background-color: var(--contrastLowest);
    border: var(--borderThin);
    border-radius: var(--radius-2);
  }

  .select__group {
    padding: 0.5rem;
  }

  .select__group-label {
    padding: 0.25rem 1rem;
    font-weight: 600;
  }

  .select__option {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: var(--size-1) var(--size-4);
    gap: var(--size-4);
    border-radius: var(--radius-1);
    width: 100%;
    border: solid 2px transparent;
  }
  .select__option:hover {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }

  .select__dot {
    width: var(--size-2);
    height: var(--size-2);
    background: var(--fgPrimary);
    border-radius: 50%;
  }
  .select__space {
    width: var(--size-2);
    height: var(--size-2);
  }
</style>
