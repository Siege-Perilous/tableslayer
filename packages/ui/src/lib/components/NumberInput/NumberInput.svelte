<script lang="ts">
  import { IconChevronDown, IconChevronUp } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';
  import { untrack } from 'svelte';
  import type { NumberInputProps } from './types';

  let {
    value = $bindable(),
    onValueChange,
    min,
    max,
    step = 1,
    isEmptyAllowed = false,
    variant = 'default',
    size = 'md',
    showStepper = true,
    isDisabled = false,
    element = $bindable(),
    ...restProps
  }: NumberInputProps = $props();

  const show = (number: number | null) => (number === null || number === undefined ? '' : String(number));
  /** What is in the field: the number, or whatever is part-way typed. */
  let text = $state(untrack(() => show(value)));
  let isEditing = $state(false);
  $effect(() => {
    const shown = show(value);
    if (!untrack(() => isEditing)) text = shown;
  });

  /** As many decimal places as the step has, so that stepping by 0.1 does not wander. */
  const places = $derived((String(step).split('.')[1] ?? '').length);
  /** Held within the least and the most, with the dust of decimal arithmetic rounded off. */
  const fitted = (number: number) =>
    Number(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, number)).toFixed(Math.max(places, 6)));

  const settle = (next: number | null) => {
    isEditing = false;
    text = show(next);
    if (next === value) return;
    value = next;
    onValueChange?.(next);
  };
  const commit = () => {
    const typed = text.trim().replace(',', '.');
    if (typed === '') return settle(isEmptyAllowed ? null : value);
    const number = Number(typed);
    settle(Number.isFinite(number) ? fitted(number) : value);
  };
  const stepBy = (by: number) => {
    if (isDisabled) return;
    const typed = Number(text.trim().replace(',', '.'));
    const from = text.trim() !== '' && Number.isFinite(typed) ? typed : (value ?? min ?? 0);
    settle(fitted(Number((from + by).toFixed(places))));
  };

  const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    restProps.onkeydown?.(event);
    if (event.defaultPrevented) return;
    const many = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      stepBy(step * many);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      stepBy(-step * many);
    } else if (event.key === 'Enter') {
      commit();
    } else if (event.key === 'Escape' && isEditing) {
      event.stopPropagation();
      settle(value);
    }
  };

  const classes = $derived([
    'numberInput',
    `numberInput--${variant}`,
    `numberInput--${size}`,
    isDisabled && 'numberInput--isDisabled',
    restProps.class ?? ''
  ]);
</script>

<!--
@component
  ## NumberInput

  A field for a number, with buttons and arrow keys that step it (Shift steps by ten). The
  number is held within `min` and `max` and told through `onValueChange` once it is settled,
  not on every key.

  @example
  ```svelte
  <NumberInput bind:value={cost} min={0} max={9} step={0.5} />
  ```
-->
<div class={classes}>
  <input
    {...restProps}
    bind:this={element}
    class="numberInput__input"
    type="text"
    inputmode="decimal"
    role="spinbutton"
    autocomplete="off"
    aria-valuenow={value ?? undefined}
    aria-valuemin={min}
    aria-valuemax={max}
    disabled={isDisabled}
    value={text}
    oninput={(event) => {
      isEditing = true;
      text = event.currentTarget.value;
      restProps.oninput?.(event);
    }}
    onblur={(event) => {
      if (isEditing) commit();
      restProps.onblur?.(event);
    }}
    {onkeydown}
  />
  {#if showStepper}
    <div class="numberInput__stepper">
      <button
        type="button"
        class="numberInput__step"
        aria-label="More"
        tabindex="-1"
        disabled={isDisabled || (max !== undefined && value !== null && value >= max)}
        onpointerdown={(event) => event.preventDefault()}
        onclick={() => stepBy(step)}
      >
        <Icon Icon={IconChevronUp} size="0.625rem" />
      </button>
      <button
        type="button"
        class="numberInput__step"
        aria-label="Less"
        tabindex="-1"
        disabled={isDisabled || (min !== undefined && value !== null && value <= min)}
        onpointerdown={(event) => event.preventDefault()}
        onclick={() => stepBy(-step)}
      >
        <Icon Icon={IconChevronDown} size="0.625rem" />
      </button>
    </div>
  {/if}
</div>

<style>
  .numberInput {
    display: flex;
    align-items: stretch;
    width: 100%;
    height: 2rem;
    font-family: var(--font-sans);
    background: var(--inputBg);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    overflow: hidden;
  }
  .numberInput:focus-within {
    border-color: var(--fg);
    background: var(--inputFocusBg);
  }
  .numberInput--sm {
    height: 1.5rem;
    font-size: 0.875rem;
  }
  .numberInput--transparent {
    border-color: transparent;
    background: transparent;
  }
  .numberInput--transparent:hover {
    border-color: var(--inputBorderColor);
  }
  .numberInput--transparent:focus-within {
    border-color: var(--fg);
    background: var(--inputFocusBg);
  }
  .numberInput--isDisabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .numberInput:has([aria-invalid='true']) {
    border-color: var(--fgDanger);
  }

  .numberInput__input {
    flex: 1;
    width: 100%;
    min-width: 0;
    padding: 0 0.25rem 0 0.75rem;
    font: inherit;
    font-variant-numeric: tabular-nums;
    color: inherit;
    background: transparent;
    border: none;
    outline: none;
  }
  .numberInput--sm .numberInput__input {
    padding-left: 0.5rem;
  }
  .numberInput__input:disabled {
    cursor: not-allowed;
  }

  .numberInput__stepper {
    display: flex;
    flex: none;
    flex-direction: column;
    width: 1.125rem;
    border-left: var(--borderThin);
    border-color: var(--inputBorderColor);
    opacity: 0;
  }
  .numberInput:hover .numberInput__stepper,
  .numberInput:focus-within .numberInput__stepper {
    opacity: 1;
  }
  .numberInput__step {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 0;
    color: var(--fgMuted);
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .numberInput__step:hover:not(:disabled) {
    color: var(--fg);
    background: var(--contrastLow);
  }
  .numberInput__step:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
