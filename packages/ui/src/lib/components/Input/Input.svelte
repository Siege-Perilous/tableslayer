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
    border: var(--border-1);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    padding: 0 var(--size-3);
    background: var(--inputBg);
    &:focus-visible {
      outline: none;
      border-color: var(--fg);
    }
  }
  [data-fs-error] {
    border-color: var(--textDanger);
  }
</style>
