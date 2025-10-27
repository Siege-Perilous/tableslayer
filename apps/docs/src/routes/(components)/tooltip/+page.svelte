<script lang="ts">
  import { ToolTip, Icon } from '@tableslayer/ui';
  import { IconHeart } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  import type { Snippet } from 'svelte';
</script>

{#snippet toolTipContent()}
  <div>hello</div>
{/snippet}

<Example title="ToolTip" propsName="ToolTip">
  <ToolTip positioning={{ placement: 'right' }} toolTipContent={toolTipContent as Snippet}>
    <Icon Icon={IconHeart} size="2rem" />
  </ToolTip>
</Example>
