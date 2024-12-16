<script lang="ts">
  import { Label } from 'formsnap';
  import type { LabelProps } from './types';
  import classNames from 'classnames';
  import { Label as StyledLabel } from './index';
  let { children, ...restProps }: LabelProps = $props();

  const labelClasses = classNames('label', restProps.class ?? '');
</script>

<Label>
  {#snippet child(props)}
    <StyledLabel {...props} {...restProps} class={labelClasses}>
      {@render children()}
    </StyledLabel>
  {/snippet}
</Label>
