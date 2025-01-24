<script lang="ts">
  import { Label } from 'formsnap';
  import type { LabelProps } from './types';
  import { Label as StyledLabel } from './index';
  let { children, ...restProps }: LabelProps = $props();

  let labelClasses = $derived(['label', restProps.class ?? '']);
</script>

<Label>
  {#snippet child(props)}
    <StyledLabel {...props} {...restProps} class={labelClasses}>
      {@render children()}
    </StyledLabel>
  {/snippet}
</Label>
