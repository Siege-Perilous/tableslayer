<script lang="ts">
  import { ContextMenu, Icon, type ContextMenuItem } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import { IconBell } from '@tabler/icons-svelte';
  import type { Snippet } from 'svelte';

  const items: ContextMenuItem[] = [
    { label: 'Link', href: '/link' },
    { type: 'divider' },
    { label: 'Alert', onclick: () => alert('Alert'), end: alertEnd as Snippet },
    { label: 'Quit', href: '#', end: quitEnd as Snippet }
  ];
</script>

{#snippet alertEnd()}
  <Icon Icon={IconBell} size="1.25rem" />
{/snippet}

{#snippet quitEnd()}
  <div>⌘Q</div>
{/snippet}

<Example title="Avatar" propsName="Avatar">
  <ContextMenu {items}>
    {#snippet trigger()}
      <div class="trigger">Right click me</div>
    {/snippet}
  </ContextMenu>
</Example>

<style>
  .trigger {
    padding: 3rem;
    border: dashed 2px var(--fg);
    border-radius: 0.25rem;
  }
</style>
