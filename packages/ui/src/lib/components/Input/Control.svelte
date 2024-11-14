<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label } from './index';

  type Props = {
    children: Snippet;
    label?: string;
  };

  let { children, label }: Props = $props();
</script>

<div class="control">
  {#if label}
    <Label class="control__label">{label}</Label>
  {/if}
  {@render children()}
</div>

<style>
  .control {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }

  :global(.control .control__label) {
    display: block;
  }
</style>
