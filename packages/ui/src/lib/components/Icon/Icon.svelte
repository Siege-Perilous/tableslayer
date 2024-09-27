<script lang="ts">
  import type { IconProps } from './types';
  let { Icon, size = '1rem', color, stroke = 3, ...restProps }: IconProps = $props();
</script>

<Icon {size} {color} {stroke} {...restProps}></Icon>
