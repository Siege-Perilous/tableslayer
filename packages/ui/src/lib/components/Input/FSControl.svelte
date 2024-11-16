<script lang="ts">
  import { Control } from 'formsnap';
  import { Control as StyledControl } from './index';
  import type { Snippet } from 'svelte';

  type ControlProps = {
    children: Snippet<[{ attrs?: Record<string, unknown> }]>;
    label?: string;
    start?: Snippet;
    end?: Snippet;
    attrs?: Record<string, unknown>;
  };

  let { children, label, start, end }: ControlProps = $props();
</script>

<Control let:attrs>
  <StyledControl {label} {start} {end} {attrs}>
    {@render children({ attrs })}
  </StyledControl>
</Control>
