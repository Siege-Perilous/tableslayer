<script lang="ts">
  import { Button, PropsTable, ColorModeCompare, CodeBlock } from '@tableslayer/ui';
  import { IconCheck } from '@tabler/icons-svelte';
  const example = `import { Button } from '@tableslayer/ui';
import { IconCheck } from '@tabler/icons-svelte';

<Button start={iconCheck}>Hello I am a button</Button>
`;
</script>

{#snippet iconCheck()}
  <IconCheck size={'1rem'} stroke={4} />
{/snippet}

<ColorModeCompare>
  <Button start={iconCheck}>Hello I am a button</Button>
</ColorModeCompare>

<PropsTable componentName="Button" />

<CodeBlock code={example} lang="svelte" />
