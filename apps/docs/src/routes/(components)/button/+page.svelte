<script lang="ts">
  import { Button, RadioButton, CodeBlock, Icon, Spacer, ConfirmActionButton, Text } from '@tableslayer/ui';
  import { IconCheck, IconX, IconGhost3, IconSun, IconCloud, IconSnowflake } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  import type { Snippet } from 'svelte';
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

<Spacer size="2rem" />

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

<Spacer size="2rem" />

<Example title="RadioButton" propsName="ConfirmActionButton" layout="column">
  <RadioButton
    selected="opt1"
    options={[
      { label: 'Option 1', value: 'opt1' },
      { label: 'Options 2', value: 'opt2' },
      { label: 'Option 3', value: 'opt3' }
    ]}
  />
  <RadioButton
    selected="opt1"
    options={[
      { label: sun as Snippet, value: 'opt1' },
      { label: cloud as Snippet, value: 'opt2' },
      { label: snow as Snippet, value: 'opt3' }
    ]}
  />
</Example>

{#snippet sun()}
  <Icon Icon={IconSun} size="1.25rem" />
{/snippet}
{#snippet cloud()}
  <Icon Icon={IconCloud} size="1.25rem" />
{/snippet}
{#snippet snow()}
  <Icon Icon={IconSnowflake} size="1.25rem" />
{/snippet}
