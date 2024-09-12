<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type ButtonProps = {
    children: Snippet;
  } & HTMLButtonAttributes;

  let { children, ...restProps }: ButtonProps = $props();
</script>

<button class="btn" {...restProps}>
  {@render children()}
</button>

<style>
  :global(.light) {
    color-scheme: light;
    --btn-bg: var(--gray-2);
    --btn-border: solid 1px var(--gray-3);
  }

  :global(.dark) {
    color-scheme: dark;
    --btn-bg: var(--gray-9);
    --btn-border: solid 1px var(--gray-8);
  }

  .btn {
    background-color: var(--btn-bg);
    box-shadow: var(--shadow-2);
    height: var(--size-5);
    padding: 0 var(--size-2);
    border-radius: var(--radius-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: var(--btn-border);
    cursor: pointer;
  }
  .btn:hover {
    background-color: var(--gray-8);
    border-color: var(--gray-7);
  }
</style>
