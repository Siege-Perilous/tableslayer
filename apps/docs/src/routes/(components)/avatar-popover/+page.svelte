<script lang="ts">
  import { AvatarPopover } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="AvatarPopover" propsName="AvatarPopover">
  <AvatarPopover src="https://avatars.githubusercontent.com/u/324519?v=4">
    {#snippet content()}
      <p>Popover content</p>
    {/snippet}
  </AvatarPopover>
</Example>
