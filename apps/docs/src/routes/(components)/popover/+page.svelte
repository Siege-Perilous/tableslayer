<script lang="ts">
  import { Button, Popover } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Popover" propsName="Popover">
  <Popover>
    {#snippet trigger()}
      <Button>Click me</Button>
    {/snippet}
    {#snippet content()}
      <p>Popover content</p>
    {/snippet}
  </Popover>
  <Popover positioning={{ placement: 'right' }}>
    {#snippet trigger()}
      <Button>Place right</Button>
    {/snippet}
    {#snippet content()}
      <p>Popover content</p>
    {/snippet}
  </Popover>
</Example>
