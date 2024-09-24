<script lang="ts">
  import type { InputProps } from './types';
  let { value, placeholder, type, ...restProps }: InputProps = $props();
  import classNames from 'classnames';

  const inputClasses = classNames('input', restProps.class ?? '');
</script>

<input {type} {value} {placeholder} class={inputClasses} {...restProps} />

<style>
  .input {
    height: var(--size-7);
    border: var(--border-1);
    border-color: var(--fg);
    border-radius: var(--radius-3);
    padding: 0 var(--size-3);
  }
</style>
