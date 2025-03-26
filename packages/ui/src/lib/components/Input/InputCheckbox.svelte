<script lang="ts">
  import type { InputCheckboxProps } from './types';
  let {
    checked = $bindable(),
    element = $bindable(),
    variant = 'default',
    label,
    hideAutocomplete,
    ...restProps
  }: InputCheckboxProps = $props();

  const inputClasses = $derived(['input', variant && `input--${variant}`, restProps.class ?? '']);
  let autoCompleteOffAttrs = hideAutocomplete
    ? {
        autocomplete: 'off' as const,
        'data-1p-ignore': 'true' as const,
        'data-lpignore': 'true' as const
      }
    : {};

  const id = `checkbox-${crypto.randomUUID()}`;
</script>

<label for={id}>
  <input
    type="checkbox"
    {id}
    bind:this={element}
    bind:checked
    {...restProps}
    {...autoCompleteOffAttrs}
    class={inputClasses}
  />
  {#if typeof label === 'string'}
    {label}
  {:else}
    {@render label()}
  {/if}
</label>

<style>
  label {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 0.5rem;
  }
  input[type='checkbox'] {
    /* Add if not using autoprefixer */
    -webkit-appearance: none;
    /* Remove most all native input styles */
    appearance: none;
    /* For iOS < 15 */
    background-color: var(--inputBg);
    /* Not removed via appearance */
    margin: 0;

    font: inherit;
    color: currentColor;
    width: 1.5rem;
    height: 1.5rem;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    display: grid;
    place-content: center;
    cursor: pointer;
  }
  input[type='checkbox']::before {
    content: '';
    width: 0.875rem;
    height: 0.875rem;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    opacity: 0;
    transform-origin: bottom left;
    transition: 100ms opacity ease-in;
    box-shadow: inset 1em 1em var(--fgPrimary);
    /* Windows High Contrast Mode */
    background-color: CanvasText;
  }
  input[type='checkbox']:checked::before {
    opacity: 1;
  }
  input[type='checkbox']:disabled {
    color: var(--fgMuted);
    cursor: not-allowed;
  }
  .input--transparent {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }
  [data-fs-error],
  [aria-invalid='true'] {
    border-color: var(--fgDanger);
  }
</style>
