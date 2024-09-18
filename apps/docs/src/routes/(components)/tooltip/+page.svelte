<script lang="ts">
  import { ToolTip, Icon, PropsTable, ColorModeCompare } from '@tableslayer/ui';
  import { IconHeart } from '@tabler/icons-svelte';
</script>

{#snippet toolTipContent()}
  <div>hello</div>
{/snippet}

<ColorModeCompare>
  <ToolTip positioning={{ placement: 'right' }} {toolTipContent}>
    <Icon Icon={IconHeart} size="2rem" />
  </ToolTip>
</ColorModeCompare>

<PropsTable componentName="ToolTip" />
