<script lang="ts">
  import { IconHexagon, IconLine, IconMapPin } from '@tabler/icons-svelte';
  import { Spacer, Tabs, Text } from '@tableslayer/ui';
  import { Example } from '#lib/components/index.js';

  const tools = [
    { id: 'terrain', label: 'Terrain', icon: IconHexagon },
    { id: 'hexsides', label: 'Hexsides', icon: IconLine, badge: 212 },
    { id: 'features', label: 'Features', icon: IconMapPin },
    { id: 'later', label: 'Later', isDisabled: true }
  ];
  let underline = $state('terrain');
  let segmented = $state('hexsides');
  let small = $state('terrain');
</script>

<p class="docLead">
  A row of tabs, one of them selected. Left and right arrows move along it, Home and End go to its ends. A tab can be a
  link, for a row that switches pages.
</p>

<Example title="Underline" propsName="Tabs" layout="column">
  <Tabs tabs={tools} bind:selected={underline} data-testid="underline">
    {#snippet children({ selected })}
      <div style="padding: 0.75rem 0"><Text size="0.875rem">The {selected} tool's settings go here.</Text></div>
    {/snippet}
  </Tabs>
</Example>
<p class="docNote">With what the selected tab holds below it.</p>
<Spacer size="2rem" />

<Example title="Segmented" propsName="">
  <Tabs tabs={tools.slice(0, 3)} bind:selected={segmented} variant="segmented" />
</Example>
<p class="docNote">A row to switch with and nothing more: the page shows what it likes.</p>
<Spacer size="2rem" />

<Example title="Small" propsName="">
  <Tabs tabs={tools.slice(0, 3)} bind:selected={small} size="sm" />
  <Tabs tabs={tools.slice(0, 3)} bind:selected={small} size="sm" variant="segmented" />
</Example>
<Spacer size="2rem" />

<style>
  .docLead {
    max-width: 44rem;
    margin: 0 0 2rem;
    line-height: 1.5;
    color: var(--fgMuted);
  }
  .docNote {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: var(--fgMuted);
  }
</style>
