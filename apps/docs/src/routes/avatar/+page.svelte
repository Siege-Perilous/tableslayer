<script lang="ts">
  import { Avatar, ToolTip } from '@tableslayer/ui';
</script>

{#snippet toolTipContent()}
  <div>hello</div>
{/snippet}

<ToolTip positioning={{ placement: 'right' }} {toolTipContent}>
  <Avatar src="https://avatars.githubusercontent.com/u/1162160?v=4" alt="Melt" initials="M" size="lg" />
</ToolTip>
