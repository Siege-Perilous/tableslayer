<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Control, type ControlProps } from 'formsnap';
  import { Label } from './index';

  type Props = Omit<ControlProps, 'children'> & {
    children: Snippet<[{ attrs: Record<string, unknown> }]>;
    label?: string;
  };

  let { children, label }: Props = $props();
</script>

<Control let:attrs>
  <div class="control">
    {#if label}
      <Label class="control__label">{label}</Label>
    {/if}
    {@render children({ attrs })}
  </div>
</Control>

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
