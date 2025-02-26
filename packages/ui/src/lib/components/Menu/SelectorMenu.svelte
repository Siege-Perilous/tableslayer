<script lang="ts">
  import { computePosition, offset, flip, shift, platform } from '@floating-ui/dom';
  import { tick, type Snippet } from 'svelte';
  import { type SelectorMenuProps } from './types';
  import { IconButton } from '../Button';
  import { Icon } from '../Icon';
  import { IconSelector } from '@tabler/icons-svelte';
  import { type SelectOption } from '../Select';
  let {
    trigger,
    options,
    selected = $bindable(),
    disabled = false,
    variant = 'default',
    positioning = { placement: 'bottom-start', offset: 8 },
    onSelectedChange,
    footer,
    ...restProps
  }: SelectorMenuProps = $props();

  let button: HTMLElement | null = null;
  let menu = $state<HTMLElement | null>(null);
  let isOpen = $state(false);
  let activeIndex = $state<number | null>(null);
  let floatingStyles = $state('');

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
      if (options.length > 0) {
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
    selected = value;
    closeMenu();
    if (onSelectedChange) {
      onSelectedChange(selected);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;
    const currentIndex = activeIndex ?? -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        activeIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        activeIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex !== null) {
          handleSelection(options[activeIndex].value);
        }
        break;
      case 'Escape':
        closeMenu();
        break;
    }
  }

  function isSelected(value: string) {
    return selected === value;
  }

  function isSnippet(value: string | Snippet): value is Snippet {
    return typeof value === 'function';
  }

  function getOptionIndex(option: SelectOption): number {
    return options.findIndex((o) => o.value === option.value);
  }

  const footerProps = {
    close: closeMenu
  };
</script>

<svelte:window onclick={handleGlobalClick} />

<div class={['selectorMenu', `selectorMenu--${variant}`, restProps.class]}>
  <button
    bind:this={button}
    onclick={toggleMenu}
    onkeydown={handleKeydown}
    data-testid="menuButton"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-disabled={disabled}
    {...restProps}
  >
    {#if trigger}
      {@render trigger()}
    {:else}
      <IconButton as="div" variant="ghost">
        <Icon Icon={IconSelector} />
      </IconButton>
    {/if}
  </button>
  {#if isOpen}
    <div bind:this={menu} class="selectorMenu__popover" style={floatingStyles}>
      <ul role="listbox" class="selectorMenu__optionList">
        {#each options as option}
          <li
            class={[
              'selectorMenu__option',
              isSelected(option.value) && 'selectorMenu__option--isSelected',
              getOptionIndex(option) === activeIndex && ' selectorMenu__option--isActive'
            ]}
            tabindex="0"
            onclick={() => handleSelection(option.value)}
            onkeydown={handleKeydown}
            role="option"
            data-testid="menuItem"
            aria-selected={isSelected(option.value)}
          >
            <div class="selectorMenu__start">
              <div class="selectorMenu__space">
                {#if isSelected(option.value)}
                  <div class="selectorMenu__dot"></div>
                {/if}
              </div>
              {#if option.icon}
                <Icon Icon={option.icon} size="1.25rem" />
              {/if}
              {#if isSnippet(option.label)}
                {@render option.label()}
              {:else}
                {option.label}
              {/if}
            </div>
            {#if option.key}
              <div class="selectorMenu__end">
                <div class="selectorMenu__key">{option.key}</div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      {#if footer}
        <div class="selectorMenu__footer">
          {@render footer({ footerProps })}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .selectorMenu {
    position: relative;
    display: inline-block;
    width: 100%;
  }
  .selectorMenu--transparent .select__button {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }

  .selectorMenu__popover {
    position: absolute;
    background: var(--popoverBg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
    white-space: nowrap;
    z-index: 1000;
    padding: 0.25rem;
    list-style: none;
  }
  .selectorMenu__optionList {
    max-height: 300px;
    overflow-y: auto;
  }

  .selectorMenu__option {
    width: 100%;
    padding: 0.25rem 1rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    gap: 3rem;
    border: solid 2px transparent;
    text-indent: -0.5rem;
    line-height: 1.2rem;
  }

  .selectorMenu__option:hover,
  .selectorMenu__option:focus {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
  .selectorMenu__option--isActive {
    background-color: var(--menuItemHover);
  }

  .selectorMenu__icon {
    margin-left: auto;
  }

  .selectorMenu__dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--fgPrimary);
    border-radius: 50%;
  }
  .selectorMenu__space {
    width: 0.5rem;
    height: 0.5rem;
  }
  .selectorMenu__selected {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  .selectorMenu__start {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .selectorMenu__key {
    display: flex;
    text-indent: 0;
    color: var(--fgMuted);
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }
</style>
