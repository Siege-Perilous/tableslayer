<script lang="ts">
  import { createLabel, melt } from '@melt-ui/svelte';
  import type { LabelProps } from './types';
  let { id, children, ...restProps }: LabelProps = $props();

  const {
    elements: { root }
  } = createLabel();
</script>

<label for={id} use:melt={$root} {...restProps}>{@render children()}</label>
