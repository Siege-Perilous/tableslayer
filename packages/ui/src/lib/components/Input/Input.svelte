<script lang="ts">
  import type { InputProps } from './types';
  let { value = $bindable(), variant = 'default', ...restProps }: InputProps = $props();
  import classNames from 'classnames';

  const inputClasses = classNames('input', variant && `input--${variant}`, restProps.class ?? '');
</script>

<input bind:value {...restProps} class={inputClasses} />

<style>
  .input {
    height: var(--size-8);
    font-family: var(--font-sans);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    padding: 0 var(--size-3);
    background: var(--inputBg);
    &:focus-visible {
      outline: none;
      border-color: var(--fg);
      background: var(--inputFocusBg);
    }
  }
  .input--transparent {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }
  [data-fs-error] {
    border-color: var(--fgDanger);
  }
</style>
