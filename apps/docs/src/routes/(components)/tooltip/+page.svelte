<script lang="ts">
  import { ToolTip, Icon } from '@tableslayer/ui';
  import { IconHeart } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
</script>

{#snippet toolTipContent()}
  <div>hello</div>
{/snippet}

<Example title="ToolTip" propsName="ToolTip">
  <ToolTip positioning={{ placement: 'right' }} {toolTipContent}>
    <Icon Icon={IconHeart} size="2rem" />
  </ToolTip>
</Example>
