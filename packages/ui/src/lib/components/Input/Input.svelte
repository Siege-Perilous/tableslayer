<script lang="ts">
  import type { InputProps } from './types';
  let {
    value = $bindable(),
    element = $bindable(),
    variant = 'default',
    hideAutocomplete,
    ...restProps
  }: InputProps = $props();

  const inputClasses = $derived(['input', variant && `input--${variant}`, restProps.class ?? '']);
  let autoCompleteOffAttrs = hideAutocomplete
    ? {
        autocomplete: 'off' as const,
        'data-1p-ignore': 'true' as const,
        'data-lpignore': 'true' as const
      }
    : {};
</script>

<input bind:this={element} bind:value {...restProps} {...autoCompleteOffAttrs} class={inputClasses} />

<style>
  .input {
    height: var(--size-8);
    font-family: var(--font-sans);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    padding: 0 var(--size-3);
    background: var(--inputBg);
    width: 100%;
    &:focus-visible {
      outline: none;
      border-color: var(--fg);
      background: var(--inputFocusBg);
    }
  }
  .input::placeholder {
    color: var(--fgMuted);
  }
  .input--transparent {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }
  .input[type='text'] {
    cursor: text;
  }
  [data-fs-error],
  [aria-invalid='true'] {
    border-color: var(--fgDanger);
  }
</style>
