<script lang="ts">
  import { Button, PropsTable, ColorModeCompare } from '@tableslayer/ui';
  import { IconCheck } from '@tabler/icons-svelte';
</script>

{#snippet iconCheck()}
  <IconCheck size={'1rem'} stroke={4} />
{/snippet}

<ColorModeCompare>
  <Button start={iconCheck}>Hello I am a button</Button>
</ColorModeCompare>

<PropsTable componentName="Button" />
