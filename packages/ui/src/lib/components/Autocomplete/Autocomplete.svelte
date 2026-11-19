<script lang="ts">
  import { autoUpdate, computePosition, flip, offset, shift, size as fit } from '@floating-ui/dom';
  import {
    IconCheck,
    IconChevronDown,
    IconCircleXFilled,
    IconCornerDownLeft,
    IconPlus,
    IconX
  } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';
  import { tick, untrack } from 'svelte';
  import type { AutocompleteOption, AutocompleteProps } from './types';

  let {
    options,
    selected = $bindable([]),
    onSelectedChange,
    multiple = false,
    plainText = false,
    variant = 'default',
    size = 'md',
    disabled = false,
    query = $bindable(''),
    onQueryChange,
    isOpen = $bindable(false),
    onIsOpenChange,
    onCreate,
    createLabel = (text) => `Add ${text} as a custom option`,
    clearable = true,
    filter,
    caseSensitive = false,
    sortMatchesBy = 'none',
    delimiter,
    noSuggestions = false,
    loading = false,
    debounce = 150,
    emptyText = 'There aren’t any options available',
    noMatchText = (text) => `${text} doesn’t match any options`,
    allSelectedText = 'You’ve selected all available options',
    alreadyAddedText = (label) => `${label} has already been added`,
    loadingText = 'Loading options',
    start,
    option: optionSnippet,
    positioning = { placement: 'bottom-start', offset: 4 },
    element = $bindable(),
    ...restProps
  }: AutocompleteProps = $props();

  const uid = $props.id();
  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  let root = $state<HTMLElement | null>(null);
  let menu = $state<HTMLElement | null>(null);
  let floatingStyles = $state('');
  let activeIndex = $state(-1);

  // ---- The options: a list given outright, or whatever a function finds for the text typed.
  let found = $state<AutocompleteOption[]>([]);
  let isFinding = $state(false);
  /** Every option seen so far, so that a choice can be named when it is no longer among those found. */
  const known = new Map<string, AutocompleteOption>();
  const remember = (list: AutocompleteOption[]) => {
    for (const each of list) known.set(each.value, each);
  };

  const fold = (text: string) => (caseSensitive ? text : text.toLowerCase());
  /** What has been typed, as it is shown; and as it is matched. */
  const typed = $derived(query.trim());
  const needle = $derived(fold(typed));
  const matches = (each: AutocompleteOption, text: string) =>
    filter ? filter(each, text) : fold(each.label).includes(text) || fold(each.description ?? '').includes(text);

  let request = 0;
  $effect(() => {
    if (typeof options !== 'function') return;
    const find = options;
    const text = needle;
    if (!isOpen) return;
    const mine = ++request;
    isFinding = true;
    const timer = setTimeout(
      () => {
        find(text)
          .then((list) => {
            if (mine !== request) return;
            remember(list);
            found = list;
          })
          .catch(() => {
            if (mine === request) found = [];
          })
          .finally(() => {
            if (mine === request) isFinding = false;
          });
      },
      text ? debounce : 0
    );
    return () => clearTimeout(timer);
  });
  const isBusy = $derived(isFinding || loading);

  /** Everything there is to choose from, before the text typed narrows it. */
  const pool = $derived.by(() => {
    if (typeof options === 'function') return found;
    remember(options);
    return options;
  });
  const isSelected = (value: string) => selected.includes(value);
  /** The option of a value: among those there are now, or one seen before that a search has since left out. */
  const optionOf = (value: string) => pool.find((each) => each.value === value) ?? known.get(value);
  const labelOf = (value: string) => optionOf(value)?.label ?? value;

  /** The options offered. Of several choices, those already made are in the field and not in the list. */
  const listed = $derived.by(() => {
    const open = multiple ? pool.filter((each) => !isSelected(each.value)) : pool;
    if (typeof options === 'function' || !needle) return open;
    const hits = open.filter((each) => matches(each, needle));
    if (sortMatchesBy !== 'startsWith') return hits;
    const begins = (each: AutocompleteOption) => fold(each.label).startsWith(needle);
    return [...hits.filter(begins), ...hits.filter((each) => !begins(each))];
  });

  /** The choice already made that the text typed names, if it names one. */
  const alreadyAdded = $derived(
    needle && multiple ? selected.find((value) => fold(labelOf(value)) === needle) : undefined
  );
  const canCreate = $derived(
    !!onCreate && needle.length > 0 && !alreadyAdded && !pool.some((each) => fold(each.label) === needle)
  );
  /** How many rows can be moved to: the options, and the row that offers a new one. */
  const rows = $derived(listed.length + (canCreate ? 1 : 0));
  /** What the list says when it has no rows. */
  const message = $derived(
    isBusy
      ? loadingText
      : alreadyAdded
        ? alreadyAddedText(labelOf(alreadyAdded))
        : needle
          ? noMatchText(typed)
          : pool.length > 0 && multiple
            ? allSelectedText
            : emptyText
  );

  // ---- Open and shut.
  const setOpen = (open: boolean) => {
    if (isOpen === open) return;
    isOpen = open;
    onIsOpenChange?.(open);
  };
  const setQuery = (text: string) => {
    if (element && element.value !== text) element.value = text;
    if (query === text) return;
    query = text;
    onQueryChange?.(text);
  };
  const open = () => {
    if (disabled || noSuggestions) return;
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    activeIndex = -1;
  };

  // The row that Enter would take: the first that can be chosen whenever the list changes under the text typed.
  const firstEnabled = () => listed.findIndex((each) => !each.disabled);
  $effect(() => {
    void needle;
    void rows;
    if (!isOpen) return;
    untrack(() => {
      if (needle) activeIndex = listed.length > 0 ? firstEnabled() : canCreate ? listed.length : -1;
      else if (activeIndex >= rows) activeIndex = -1;
    });
  });

  $effect(() => {
    if (!isOpen || !root || !menu) return;
    const anchor = root;
    const floating = menu;
    return autoUpdate(anchor, floating, () => {
      void computePosition(anchor, floating, {
        // Fixed, so that a scrolling panel the field sits in does not cut the list off.
        strategy: 'fixed',
        placement: positioning.placement ?? 'bottom-start',
        middleware: [
          offset(positioning.offset ?? 4),
          flip(),
          shift({ padding: 8 }),
          fit({
            padding: 8,
            apply({ rects, availableHeight }) {
              floating.style.minWidth = `${rects.reference.width}px`;
              floating.style.maxHeight = `${Math.max(96, Math.min(320, availableHeight))}px`;
            }
          })
        ]
      }).then(({ x, y }) => {
        floatingStyles = `left: ${x}px; top: ${y}px;`;
      });
    });
  });

  $effect(() => {
    if (!isOpen || activeIndex < 0) return;
    const index = activeIndex;
    void tick().then(() => document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' }));
  });

  // ---- Choosing.
  const change = (next: string[]) => {
    selected = next;
    onSelectedChange?.(next);
  };
  /** Takes an option. Of several it is added and the list stays open for the next; one alone replaces what was chosen. */
  const choose = (each: AutocompleteOption, keepFocus = true) => {
    if (each.disabled) return;
    remember([each]);
    setQuery('');
    if (multiple) {
      if (!isSelected(each.value)) change([...selected, each.value]);
      if (keepFocus) element?.focus();
      return;
    }
    change([each.value]);
    close();
  };
  const create = async (text: string, keepFocus = true) => {
    if (!onCreate || !text) return;
    const made = await onCreate(text);
    if (made) choose(made, keepFocus);
  };
  const take = (index: number) => {
    if (index < 0) return;
    if (index < listed.length) choose(listed[index]);
    else if (canCreate) void create(typed);
  };
  /** Takes each of several pieces of text: the option of that name where there is one, or else a new one. */
  const takeAll = async (texts: string[], keepFocus = true) => {
    const seen = new Set<string>();
    for (const text of texts.map((each) => each.trim())) {
      if (!text || seen.has(fold(text))) continue;
      seen.add(fold(text));
      const named = pool.find((each) => fold(each.label) === fold(text));
      if (named) choose(named, keepFocus);
      else await create(text, keepFocus);
      if (!multiple) break;
    }
    setQuery('');
  };
  const remove = (value: string) => change(selected.filter((each) => each !== value));
  const clear = () => {
    change([]);
    setQuery('');
    element?.focus();
    open();
  };
  /**
   * The field is left. Text still in it becomes a choice where it may (the option it names, or
   * a new one), and is otherwise dropped: the field never keeps text that is not a choice, since
   * it would look like one.
   */
  const leave = () => {
    const text = typed;
    close();
    if (text && (canCreate || pool.some((each) => fold(each.label) === fold(text)))) void takeAll([text], false);
    else setQuery('');
  };

  const step = (by: number) => {
    if (rows === 0) return;
    let index = activeIndex;
    for (let tried = 0; tried < rows; tried++) {
      index = (index + by + rows) % rows;
      if (index >= listed.length || !listed[index].disabled) break;
    }
    activeIndex = index;
  };

  const oninput = (event: Event & { currentTarget: HTMLInputElement }) => {
    const text = event.currentTarget.value;
    restProps.oninput?.(event);
    if (delimiter && text.includes(delimiter)) {
      void takeAll(text.split(delimiter));
      return;
    }
    setQuery(text);
    open();
  };
  const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    restProps.onkeydown?.(event);
    if (event.defaultPrevented || disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          open();
          // One choice is still in the list: the list opens on it.
          activeIndex = listed.findIndex((each) => isSelected(each.value));
          if (activeIndex < 0) step(1);
        } else step(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) open();
        step(-1);
        break;
      case 'PageDown':
      case 'PageUp':
        if (!isOpen) break;
        event.preventDefault();
        activeIndex = event.key === 'PageDown' ? rows : -1;
        step(event.key === 'PageDown' ? -1 : 1);
        break;
      case 'Enter':
        if (!isOpen && !typed) break;
        event.preventDefault();
        if (isOpen && activeIndex >= 0) take(activeIndex);
        else if (canCreate) void create(typed);
        break;
      case 'Escape':
        if (!isOpen && !query) break;
        event.preventDefault();
        event.stopPropagation();
        close();
        setQuery('');
        break;
      case 'Backspace':
        if (query === '' && selected.length > 0 && (multiple || clearable)) remove(selected[selected.length - 1]);
        break;
      case 'Tab':
        leave();
        break;
    }
  };
  const onfocus = (event: FocusEvent & { currentTarget: HTMLInputElement }) => {
    open();
    restProps.onfocus?.(event);
  };
  const onWindowPointerdown = (event: PointerEvent) => {
    if (!isOpen && !query) return;
    const target = event.target as Node;
    if (root?.contains(target) || menu?.contains(target)) return;
    leave();
  };

  /** A label cut at what was typed, so that the part that matches can be marked. */
  const parts = (label: string): [string, string, string] => {
    const at = needle ? fold(label).indexOf(needle) : -1;
    return at < 0
      ? [label, '', '']
      : [label.slice(0, at), label.slice(at, at + needle.length), label.slice(at + needle.length)];
  };

  /** Black or white, whichever reads over a hex colour; nothing for a colour given some other way. */
  const inkOver = (color: string): string | undefined => {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
    if (!hex) return undefined;
    const full = hex.length === 3 ? [...hex].map((each) => each + each).join('') : hex;
    const [red, green, blue] = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16));
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? '#000000' : '#ffffff';
  };
  const pillStyle = (value: string) => {
    const color = optionOf(value)?.color;
    if (!color) return undefined;
    const ink = inkOver(color);
    return `background: ${color};${ink ? ` color: ${ink};` : ''}`;
  };

  /** One choice shown as words in the field, which give way to whatever is typed. */
  const isPlain = $derived(!multiple && plainText);
  const pills = $derived(isPlain ? [] : selected);

  const classes = $derived([
    'autocomplete',
    `autocomplete--${variant}`,
    `autocomplete--${size}`,
    multiple && 'autocomplete--multiple',
    isOpen && 'autocomplete--isOpen',
    disabled && 'autocomplete--isDisabled',
    restProps.class ?? ''
  ]);
  /** What a screen reader is told as the list changes. */
  const status = $derived(
    !isOpen ? '' : rows === 0 ? message : `${listed.length} ${listed.length === 1 ? 'option' : 'options'}`
  );
</script>

<!--
@component
  ## Autocomplete

  A combo box: a field that holds what has been chosen as pills, with a place to type beside
  them, and under it a list of the options that match what is typed. One choice or several.
  `selected` is the values chosen, as it is for `Select`. The options are a list, or a function
  that finds those matching the text. With `onCreate`, text that matches nothing can be made
  into a new option; with a `delimiter`, several can be typed or pasted at once.

  @example
  ```svelte
  <Autocomplete
    options={[
      { value: 'woods', label: 'Woods' },
      { value: 'hills', label: 'Hills', description: 'Rough going' }
    ]}
    bind:selected
    multiple
    placeholder="Terrain"
  />
  ```
-->
<svelte:window onpointerdown={onWindowPointerdown} />

<div bind:this={root} class={classes}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="autocomplete__field" onclick={() => element?.focus()}>
    {#if start}
      <div class="autocomplete__start">{@render start()}</div>
    {/if}
    <div class="autocomplete__chosen">
      {#each pills as value (value)}
        <span class="autocomplete__pill" style={pillStyle(value)}>
          <span class="autocomplete__pillLabel">{labelOf(value)}</span>
          {#if multiple}
            <button
              type="button"
              class="autocomplete__pillRemove"
              aria-label={`Remove ${labelOf(value)}`}
              tabindex="-1"
              {disabled}
              onclick={(event) => {
                event.stopPropagation();
                remove(value);
                element?.focus();
              }}
            >
              <Icon Icon={IconX} size="0.75rem" />
            </button>
          {/if}
        </span>
      {/each}
      {#if isPlain && selected.length > 0 && !query}
        <span class="autocomplete__plain">{labelOf(selected[0])}</span>
      {/if}
      <input
        {...restProps}
        bind:this={element}
        class="autocomplete__input"
        type="text"
        role="combobox"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        placeholder={selected.length === 0 ? restProps.placeholder : undefined}
        {disabled}
        value={query}
        {oninput}
        {onkeydown}
        {onfocus}
        onclick={open}
      />
    </div>
    {#if clearable && selected.length > 0 && !disabled}
      <button
        type="button"
        class="autocomplete__clear"
        aria-label="Clear"
        tabindex="-1"
        onclick={(event) => {
          event.stopPropagation();
          clear();
        }}
      >
        <Icon Icon={IconCircleXFilled} size="0.875rem" />
      </button>
    {/if}
    {#if !noSuggestions}
      <button
        type="button"
        class="autocomplete__toggle"
        aria-label={isOpen ? 'Close the list' : 'Open the list'}
        tabindex="-1"
        {disabled}
        onpointerdown={(event) => event.preventDefault()}
        onclick={(event) => {
          event.stopPropagation();
          if (isOpen) close();
          else {
            element?.focus();
            open();
          }
        }}
      >
        <Icon Icon={IconChevronDown} size="0.875rem" />
      </button>
    {/if}
  </div>

  <div class="autocomplete__status" role="status" aria-live="polite">{status}</div>

  {#if isOpen && !noSuggestions}
    <ul
      bind:this={menu}
      id={listId}
      class="autocomplete__menu"
      style={floatingStyles}
      role="listbox"
      aria-label="Choose from the following options"
      aria-multiselectable={multiple}
      aria-busy={isBusy}
    >
      {#each listed as each, index (each.value)}
        {#if each.group && each.group !== listed[index - 1]?.group}
          <li class="autocomplete__group" role="presentation">{each.group}</li>
        {/if}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id={optionId(index)}
          class={[
            'autocomplete__option',
            index === activeIndex && 'autocomplete__option--isActive',
            isSelected(each.value) && 'autocomplete__option--isSelected',
            each.disabled && 'autocomplete__option--isDisabled'
          ]}
          role="option"
          aria-selected={isSelected(each.value)}
          aria-disabled={each.disabled}
          onpointerenter={() => !each.disabled && (activeIndex = index)}
          onpointerdown={(event) => event.preventDefault()}
          onclick={() => choose(each)}
        >
          {#if !multiple}
            <span class="autocomplete__mark">
              {#if isSelected(each.value)}<Icon Icon={IconCheck} size="0.875rem" />{/if}
            </span>
          {/if}
          {#if optionSnippet}
            {@render optionSnippet({
              option: each,
              isActive: index === activeIndex,
              isSelected: isSelected(each.value),
              query: needle
            })}
          {:else}
            {@const [before, hit, after] = parts(each.label)}
            <!-- The three parts are one word: a line break between them would put a space in it. -->
            <!-- prettier-ignore -->
            <span class="autocomplete__label">{before}<mark class="autocomplete__match">{hit}</mark>{after}</span>
            {#if each.description}
              <span class="autocomplete__description">{each.description}</span>
            {/if}
          {/if}
          <span class="autocomplete__enter" aria-hidden="true"><Icon Icon={IconCornerDownLeft} size="0.75rem" /></span>
        </li>
      {/each}
      {#if canCreate}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id={optionId(listed.length)}
          class={[
            'autocomplete__option',
            'autocomplete__option--create',
            activeIndex === listed.length && 'autocomplete__option--isActive'
          ]}
          role="option"
          aria-selected="false"
          onpointerenter={() => (activeIndex = listed.length)}
          onpointerdown={(event) => event.preventDefault()}
          onclick={() => void create(typed)}
        >
          <span class="autocomplete__mark"><Icon Icon={IconPlus} size="0.75rem" /></span>
          <span class="autocomplete__label">{createLabel(typed)}</span>
          <span class="autocomplete__enter" aria-hidden="true"><Icon Icon={IconCornerDownLeft} size="0.75rem" /></span>
        </li>
      {/if}
      {#if rows === 0}
        <li class="autocomplete__empty" role="presentation">{message}</li>
      {/if}
    </ul>
  {/if}
</div>

<style>
  .autocomplete {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .autocomplete__field {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 2rem;
    padding: 0.1875rem 0.25rem 0.1875rem 0.375rem;
    font-family: var(--font-sans);
    background: var(--inputBg);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    cursor: text;
  }
  .autocomplete__field:focus-within {
    border-color: var(--fg);
    background: var(--inputFocusBg);
  }
  .autocomplete--sm .autocomplete__field {
    min-height: 1.5rem;
    padding: 0.0625rem 0.125rem 0.0625rem 0.25rem;
    font-size: 0.875rem;
  }
  .autocomplete--transparent .autocomplete__field {
    border-color: transparent;
    background: transparent;
  }
  .autocomplete--transparent .autocomplete__field:hover {
    border-color: var(--inputBorderColor);
  }
  .autocomplete--transparent .autocomplete__field:focus-within {
    border-color: var(--fg);
    background: var(--inputFocusBg);
  }
  .autocomplete--isDisabled .autocomplete__field {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .autocomplete:has([aria-invalid='true']) .autocomplete__field {
    border-color: var(--fgDanger);
  }

  .autocomplete__start {
    display: flex;
    align-items: center;
    flex: none;
    color: var(--fgMuted);
  }

  /* What is chosen and the place to type, which wrap together onto as many lines as they need. */
  .autocomplete__chosen {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    flex: 1;
    gap: 0.25rem;
    min-width: 0;
  }

  .autocomplete__plain {
    padding-left: 0.375rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .autocomplete__input {
    flex: 1;
    width: 2rem;
    min-width: 2rem;
    height: 1.5rem;
    padding: 0 0.125rem 0 0.375rem;
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    outline: none;
    text-overflow: ellipsis;
  }
  .autocomplete--sm .autocomplete__input {
    height: 1.25rem;
  }
  .autocomplete__input::placeholder {
    color: var(--fgMuted);
  }
  .autocomplete__input:disabled {
    cursor: not-allowed;
  }
  /* After words that are the choice, the place to type is only a caret at their end. */
  .autocomplete__plain + .autocomplete__input {
    padding-left: 0;
  }

  .autocomplete__toggle,
  .autocomplete__clear,
  .autocomplete__pillRemove {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    padding: 0;
    color: var(--fgMuted);
    background: transparent;
    border: none;
    border-radius: var(--radius-1);
    cursor: pointer;
  }
  .autocomplete__toggle,
  .autocomplete__clear {
    width: 1.125rem;
    height: 1.5rem;
  }
  /* The two sit together as one group at the end of the field. */
  .autocomplete__clear {
    margin-right: -0.125rem;
  }
  .autocomplete__toggle {
    margin-right: 0.125rem;
  }
  .autocomplete__toggle:hover,
  .autocomplete__clear:hover,
  .autocomplete__pillRemove:hover {
    color: var(--fg);
  }
  .autocomplete__toggle:disabled {
    cursor: not-allowed;
  }
  .autocomplete--isOpen .autocomplete__toggle {
    transform: rotate(180deg);
  }

  .autocomplete__pill {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    max-width: 100%;
    height: 1.375rem;
    padding: 0 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    background: var(--contrastLow);
    border: solid 1px var(--contrastMedium);
    border-radius: var(--radius-1);
  }
  .autocomplete--multiple .autocomplete__pill {
    padding-right: 0.125rem;
  }
  .autocomplete--sm .autocomplete__pill {
    height: 1.125rem;
    font-size: 0.75rem;
  }
  .autocomplete__pillLabel {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .autocomplete__pillRemove {
    width: 1rem;
    height: 1rem;
    color: inherit;
    opacity: 0.6;
  }
  .autocomplete__pillRemove:hover {
    color: inherit;
    opacity: 1;
  }

  /* Read out, never seen. */
  .autocomplete__status {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .autocomplete__menu {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    margin: 0;
    padding: 0.25rem;
    list-style: none;
    overflow-y: auto;
    font-family: var(--font-sans);
    color: var(--fg);
    background: var(--popoverBg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
  }

  .autocomplete__group {
    padding: 0.5rem 0.5rem 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fgMuted);
  }

  .autocomplete__option {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    max-width: min(28rem, calc(100vw - 2rem));
    padding: 0.25rem 0.375rem 0.25rem 0.5rem;
    font-size: 0.875rem;
    white-space: nowrap;
    border: solid 2px transparent;
    cursor: pointer;
  }
  .autocomplete__option--isActive {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
  .autocomplete__option--isDisabled {
    color: var(--fgMuted);
    cursor: not-allowed;
  }

  .autocomplete__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The key that takes the option lit. It keeps its place on every row, so that the list does not change width. */
  .autocomplete__enter {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex: none;
    width: 1.125rem;
    height: 1.125rem;
    color: var(--fgMuted);
    border: solid 1px var(--contrastMedium);
    border-radius: var(--radius-1);
    visibility: hidden;
  }
  .autocomplete__option--isActive .autocomplete__enter {
    visibility: visible;
  }

  .autocomplete__mark {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex: none;
    width: 0.875rem;
    height: 0.875rem;
  }

  .autocomplete__match {
    font-weight: 700;
    color: inherit;
    background: transparent;
    text-decoration: underline;
    text-decoration-color: var(--fgPrimary);
    text-underline-offset: 0.15em;
  }
  .autocomplete__description {
    flex: none;
    padding-left: 0.5rem;
    font-size: 0.75rem;
    color: var(--fgMuted);
  }

  .autocomplete__empty {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: var(--fgMuted);
  }
</style>
