<script lang="ts">
  import { computePosition, offset, flip, shift, platform } from '@floating-ui/dom';
  import type { Snippet } from 'svelte';
  import { onDestroy, tick } from 'svelte';
  import { IconSelector } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';
  import { Text } from '../Text';
  import type { SelectProps, SelectOption } from './types';

  let {
    disabled = false,
    multiple = false,
    variant = 'default',
    selectedPrefix,
    selected = $bindable(),
    options,
    onSelectedChange,
    positioning = { placement: 'bottom-start', offset: 8 },
    ...restProps
  }: SelectProps = $props();

  let button: HTMLElement | null = null;
  let menu = $state<HTMLElement | null>(null);
  let isOpen = $state(false);
  let activeIndex = $state<number | null>(null);
  let floatingStyles = $state('');
  let selectedOptions = $state<(string | Snippet)[]>([]);

  function updatePosition() {
    if (!button || !menu) {
      return;
    }

    computePosition(button, menu, {
      placement: positioning.placement,
      middleware: [offset(positioning.offset), flip(), shift()],
      platform
    })
      .then(({ x, y, strategy }) => {
        floatingStyles = `left: ${x}px; top: ${y}px; position: ${strategy};`;
      })
      .catch((error) => {
        console.error('Error in computePosition:', error);
      });
  }

  async function toggleMenu() {
    if (disabled) return;

    isOpen = !isOpen;
    if (isOpen) {
      const flat = getFlatOptions();
      if (flat.length > 0) {
        activeIndex = 0;
      }

      await tick();
      updatePosition();
    }
  }

  const handleGlobalClick = (e: MouseEvent) => {
    if (isOpen && menu && button) {
      const target = e.target as Node;
      if (!menu.contains(target) && !button.contains(target)) {
        closeMenu();
      }
    }
  };

  function closeMenu() {
    isOpen = false;
    activeIndex = null;
  }

  function handleSelection(value: string) {
    if (multiple) {
      selected = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    } else {
      selected = [value];
      closeMenu();
    }
    if (onSelectedChange) {
      onSelectedChange(selected);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;
    const flatOptions = getFlatOptions();
    const currentIndex = activeIndex ?? -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        activeIndex = currentIndex < flatOptions.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        activeIndex = currentIndex > 0 ? currentIndex - 1 : flatOptions.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex !== null) {
          handleSelection(flatOptions[activeIndex].value);
        }
        break;
      case 'Escape':
        closeMenu();
        break;
    }
  }

  function getFlatOptions(): SelectOption[] {
    return Array.isArray(options) ? options : Object.values(options).flat();
  }

  function isSelected(value: string) {
    return selected.includes(value);
  }

  function isSnippet(value: string | Snippet): value is Snippet {
    return typeof value === 'function';
  }
  $effect(() => {
    const flatOptions = getFlatOptions();
    selectedOptions = flatOptions.filter((option) => selected.includes(option.value)).map((option) => option.label);
  });

  onDestroy(() => {
    // Cleanup logic if needed
  });

  function getOptionIndex(option: SelectOption): number {
    const flat = getFlatOptions();
    return flat.findIndex((o) => o.value === option.value);
  }
</script>

<svelte:window onclick={handleGlobalClick} />

<div class={`select select--${variant}`}>
  <button
    bind:this={button}
    class="select__button"
    onclick={toggleMenu}
    onkeydown={handleKeydown}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-disabled={disabled}
    {...restProps}
  >
    <div class="select__selected">
      {#if selected.length > 0}
        {#if selectedPrefix}
          {@render selectedPrefix()}
        {/if}
        {#each selectedOptions as label, i}
          {#if isSnippet(label)}
            <div>{@render label()}</div>
          {:else}
            <div>{label}</div>
          {/if}
          {#if i < selectedOptions.length - 1}<span>,</span>
          {/if}
        {/each}
      {:else}
        <Text color="var(--fgMuted)">Select an option</Text>
      {/if}
    </div>
    <Icon Icon={IconSelector} color="var(--fgMuted)" class="select__icon" />
  </button>

  {#if isOpen}
    <ul bind:this={menu} class="select__menu" style={floatingStyles} role="listbox">
      {#if Array.isArray(options)}
        {#each options as option}
          <li
            class={[
              'select__option',
              isSelected(option.value) && 'select__option--isSelected',
              getOptionIndex(option) === activeIndex && ' select__option--isActive'
            ]}
            tabindex="0"
            onclick={() => handleSelection(option.value)}
            onkeydown={handleKeydown}
            role="option"
            aria-selected={isSelected(option.value)}
          >
            <div class="select__space">
              {#if isSelected(option.value)}
                <div class="select__dot"></div>
              {/if}
            </div>
            {#if isSnippet(option.label)}
              {@render option.label()}
            {:else}
              {option.label}
            {/if}
          </li>
        {/each}
      {:else}
        {#each Object.entries(options) as [group, groupOptions]}
          <li class="select__group" aria-hidden="true">{group}</li>
          {#each groupOptions as option}
            <li
              class={[
                'select__option',
                isSelected(option.value) && 'select__option--isSelected',
                getOptionIndex(option) === activeIndex && 'select__option--isActive'
              ]}
              tabindex="0"
              onclick={() => handleSelection(option.value)}
              onkeydown={handleKeydown}
              role="option"
              aria-selected={isSelected(option.value)}
            >
              <div class="select__space">
                {#if isSelected(option.value)}
                  <div class="select__dot"></div>
                {/if}
              </div>
              {#if isSnippet(option.label)}
                {@render option.label()}
              {:else}
                {option.label}
              {/if}
            </li>
          {/each}
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .select {
    position: relative;
    display: inline-block;
    width: 100%;
  }
  .select--transparent .select__button {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }

  .select__button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 2rem;
    font-family: var(--font-sans);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    padding: 0.125rem 0.75rem;
    background: var(--inputBg);
    cursor: pointer;
    gap: 0.5rem;
    &:focus-visible {
      outline: none;
      border-color: var(--fg);
      background: var(--inputFocusBg);
    }
    > div {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .select__menu {
    position: absolute;
    background: var(--popoverBg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
    min-width: 100%;
    z-index: 1000;
    padding: 0.25rem;
    list-style: none;
    max-height: 300px;
    overflow-y: auto;
  }

  .select__option {
    padding: 0.25rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    gap: 0.5rem;
    border: solid 2px transparent;
    gap: 1rem;
  }

  .select__option:hover,
  .select__option:focus {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
  .select__option--isActive {
    background-color: var(--menuItemHover);
  }

  .select__group {
    padding: 0.5rem;
    font-weight: bold;
    color: var(--muted);
  }

  .select__icon {
    margin-left: auto;
  }

  .select__check {
    margin-left: auto;
    color: var(--check-color);
  }

  .select__dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--fgPrimary);
    border-radius: 50%;
  }
  .select__space {
    width: 0.5rem;
    height: 0.5rem;
  }
  .select__selected {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
</style>
