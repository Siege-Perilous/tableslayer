<script lang="ts">
  import { IconButton, Icon } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import { IconPlus, IconGhost3, IconX, IconLink } from '@tabler/icons-svelte';
</script>

<Example title="IconButton" propsName="IconButton">
  <IconButton onclick={() => alert('hello')}>
    <Icon Icon={IconPlus} />
  </IconButton>
  <IconButton onclick={() => alert('hello')} variant="danger">
    <Icon Icon={IconX} />
  </IconButton>
  <IconButton onclick={() => alert('hello')} variant="ghost">
    <Icon Icon={IconGhost3} size="1.5rem" />
  </IconButton>
  <IconButton onclick={() => alert('hello')} variant="link">
    <Icon Icon={IconLink} />
  </IconButton>
</Example>
