<script lang="ts">
  import type { InputProps } from './types';
  let { value = $bindable(), ...restProps }: InputProps = $props();
  import classNames from 'classnames';

  const inputClasses = classNames('input', restProps.class ?? '');
</script>

<input bind:value {...restProps} class={inputClasses} />

<style>
  .input {
    height: var(--size-7);
    border: var(--border-1);
    border-radius: var(--radius-2);
    padding: 0 var(--size-3);
  }
</style>
