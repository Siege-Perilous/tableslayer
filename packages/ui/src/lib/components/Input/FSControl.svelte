<script lang="ts">
  import { Control } from 'formsnap';
  import { Control as StyledControl } from './index';
  import type { Snippet } from 'svelte';

  type ControlProps = {
    content: Snippet<[{ props?: Record<string, unknown> }]>;
    label?: string;
    start?: Snippet;
    end?: Snippet;
  };

  let { content, label, start, end }: ControlProps = $props();
</script>

<Control>
  {#snippet children({ props })}
    <StyledControl {label} {start} {end} {props}>
      {@render content({ props })}
    </StyledControl>
  {/snippet}
</Control>
