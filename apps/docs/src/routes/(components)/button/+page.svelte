<script lang="ts">
  import { Button, CodeBlock } from '@tableslayer/ui';
  import { IconCheck } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  const example = `import { Button } from '@tableslayer/ui';
import { IconCheck } from '@tabler/icons-svelte';

<Button start={iconCheck}>Hello I am a button</Button>
`;
</script>

{#snippet iconCheck()}
  <IconCheck size={'1rem'} stroke={4} />
{/snippet}

<Example title="Button" propsName="Button">
  <Button start={iconCheck}>Hello I am a button</Button>
</Example>

<CodeBlock code={example} lang="svelte" />
