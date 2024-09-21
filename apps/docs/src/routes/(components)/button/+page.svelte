<script lang="ts">
  import { Button, CodeBlock, Icon } from '@tableslayer/ui';
  import { IconCheck, IconX, IconGhost3 } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  const example = `import { Button } from '@tableslayer/ui';
import { IconCheck, IconX } from '@tabler/icons-svelte';

<Button start={iconCheck}>Hello I am a button</Button>
`;
</script>

{#snippet primaryStart()}
  <Icon Icon={IconCheck} />
{/snippet}
{#snippet dangerStart()}
  <Icon Icon={IconX} />
{/snippet}
{#snippet ghostStart()}
  <Icon Icon={IconGhost3} size="1.5rem" />
{/snippet}

<Example title="Button" propsName="Button" layout="column">
  <Button start={primaryStart}>Primary</Button>
  <Button start={dangerStart} variant="danger">Danger</Button>
  <Button start={ghostStart} variant="ghost">Ghost</Button>
  <Button start={dangerStart} variant="link" class="something">Link</Button>
</Example>

<CodeBlock code={example} lang="svelte" />

<style>
  :global(.btn.something) {
    color: var(--fg);
  }
</style>
