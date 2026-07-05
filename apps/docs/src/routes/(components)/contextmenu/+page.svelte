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

  let controlledMenu = $state<ContextMenu>();
  let visibility = $state('everyone');
  const controlledItems: ContextMenuItem[] = $derived([
    { type: 'label', label: 'Visibility' },
    { label: 'DM', selected: visibility === 'dm', onclick: () => (visibility = 'dm') },
    { label: 'Everyone', selected: visibility === 'everyone', onclick: () => (visibility = 'everyone') },
    { label: 'On hover', selected: visibility === 'hover', onclick: () => (visibility = 'hover') },
    { type: 'divider' },
    { label: 'Delete', variant: 'danger', onclick: () => alert('Deleted') }
  ]);
</script>

{#snippet alertEnd()}
  <Icon Icon={IconBell} size="1.25rem" />
{/snippet}

{#snippet quitEnd()}
  <div>⌘Q</div>
{/snippet}

<Example title="Context menu" propsName="ContextMenu">
  <ContextMenu {items}>
    {#snippet trigger()}
      <div class="trigger">Right click me</div>
    {/snippet}
  </ContextMenu>
</Example>

<Example title="Controlled with selection and danger items" propsName="ContextMenu">
  <div class="trigger" role="presentation" oncontextmenu={(e) => controlledMenu?.open(e)}>
    Right click me (opened via open(event))
  </div>
  <ContextMenu bind:this={controlledMenu} items={controlledItems} />
</Example>

<style>
  .trigger {
    padding: 3rem;
    border: dashed 2px var(--fg);
    border-radius: 0.25rem;
  }
</style>
