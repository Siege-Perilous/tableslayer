<script lang="ts">
  import { Button, CodeBlock, Icon, Spacer, ConfirmActionButton, Text } from '@tableslayer/ui';
  import { IconCheck, IconX, IconGhost3 } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  const example = `import { Button, Icon } from '@tableslayer/ui';
import { IconCheck } from '@tabler/icons-svelte';

<Button>
  {#snippet start()}
    <Icon Icon={IconCheck} />
  {/snippet}
  Primary
</Button>
`;
  const confirmActionExample = `import { Button, ConfirmActionButton, Text } from '@tableslayer/ui';
<ConfirmActionButton actionButtonText="Double sure?" action={() => alert('hello')}>
  {#snippet trigger({ triggerProps })}
    <Button variant="danger" {...triggerProps}>Delete this thing?</Button>
  {/snippet}
  {#snippet actionMessage()}
    <Text>Are you sure you want to delete this thing?</Text>
  {/snippet}
</ConfirmActionButton>
`;
</script>

<Example title="Button" propsName="Button" layout="column">
  {#snippet codeBlock()}
    <CodeBlock code={example} lang="svelte" />
  {/snippet}
  <Button>
    {#snippet start()}
      <Icon Icon={IconCheck} />
    {/snippet}
    Primary
  </Button>
  <Button variant="danger">
    {#snippet start()}
      <Icon Icon={IconX} />
    {/snippet}
    Danger
  </Button>
  <Button variant="ghost">
    {#snippet start()}
      <Icon Icon={IconGhost3} size="1.25rem" />
    {/snippet}
    Ghost
  </Button>
  <Button variant="link" class="something">Link</Button>
</Example>

<Spacer size={8} />

<Example title="ConfirmActionButton" propsName="ConfirmActionButton" layout="column">
  {#snippet codeBlock()}
    <CodeBlock code={confirmActionExample} lang="svelte" />
  {/snippet}

  <ConfirmActionButton actionButtonText="Double sure?" action={() => alert('hello')}>
    {#snippet trigger({ triggerProps })}
      <Button variant="danger" {...triggerProps}>Delete this thing?</Button>
    {/snippet}
    {#snippet actionMessage()}
      <Text>Are you sure you want to delete this thing?</Text>
    {/snippet}
  </ConfirmActionButton>
</Example>
