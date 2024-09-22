<script lang="ts">
  import { Button, CodeBlock, Icon } from '@tableslayer/ui';
  import { IconCheck, IconX, IconGhost3 } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  const example = `import { Button } from '@tableslayer/ui';
import { IconCheck, IconX } from '@tabler/icons-svelte';

<Button start={iconCheck}>Hello I am a button</Button>
`;
</script>

<Example title="Button" propsName="Button" layout="column">
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
      <Icon Icon={IconGhost3} size="1.5rem" />
    {/snippet}
    Ghost
  </Button>
  <Button variant="link" class="something">Link</Button>
</Example>

<CodeBlock code={example} lang="svelte" />
