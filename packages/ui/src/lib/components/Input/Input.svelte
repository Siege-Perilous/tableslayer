<script lang="ts">
  import type { InputProps } from './types';
  let { value = $bindable(), ...restProps }: InputProps = $props();
  import classNames from 'classnames';

  const inputClasses = classNames('input', restProps.class ?? '');
</script>

<input bind:value {...restProps} class={inputClasses} />

<style>
  .input {
    height: var(--size-8);
    font-family: var(--font-mono);
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
  [data-fs-error] {
    border-color: var(--fgDanger);
  }
</style>
