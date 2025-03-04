<script lang="ts">
  import type { RadioButtonProps } from './types';

  let { options, selected = '', variant = 'default', onSelectedChange, ...restProps }: RadioButtonProps = $props();

  function handleChange(value: string) {
    selected = value;
    onSelectedChange?.(value);
  }

  const radioClasses = (value: string) =>
    ['radioButton', `radioButton--${variant}`, value === selected ? 'radioButton--checked' : ''].join(' ');
</script>

<!--
@component
  ## RadioButton

  A radio button component styled like a segmented button group.

  @props
  - `options` - Array of `{ label, value }` objects for each option.
  - `variant` - Optional styling variant.
  - `selected` - The currently selected value (bindable).
  - `onchange` - Callback when selection changes.
-->

<div class="radioGroup" {...restProps}>
  {#each options as { label, value }}
    <label class={radioClasses(value)}>
      <input
        type="radio"
        name="radio"
        checked={value === selected}
        {value}
        bind:group={selected}
        onchange={() => handleChange(value)}
      />
      {#if typeof label === 'string'}
        {label}
      {:else}
        {@render label()}
      {/if}
    </label>
  {/each}
</div>

<style>
  .radioGroup {
    display: inline-flex;
    border-radius: var(--radius-2);
    overflow: hidden;
    height: var(--size-8);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
  }

  .radioButton {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-1);
    height: 100%;
    cursor: pointer;
    border: none;
    padding: 0 0.5rem;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
    user-select: none;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .radioButton input {
    display: none;
  }

  .radioButton--default {
    background-color: var(--btn-bg);
    color: var(--fgMuted);
  }
  .radioButton--default:hover {
    text-decoration: underline;
  }
  .radioButton--default.radioButton--checked {
    background-color: var(--inputBorderColor);
    color: var(--fg);
  }
</style>
