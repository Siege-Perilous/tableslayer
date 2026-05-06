<script lang="ts">
  import { TextHighlight, Text, Spacer } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import { IconMap, IconGrid4x4, IconScreenShare } from '@tabler/icons-svelte';
</script>

<Example title="TextHighlight" propsName="TextHighlight">
  <div class="flex">
    <p>
      Open the <TextHighlight text="Map" icon={IconMap} /> controls to adjust settings.
    </p>
    <p>
      Click on the <TextHighlight text="Grid" icon={IconGrid4x4} /> controls in the toolbar.
    </p>
    <p>
      Use the <TextHighlight text="Play" icon={IconScreenShare} /> controls to broadcast.
    </p>
  </div>
</Example>
<Spacer size="2rem" />

<Example title="Without icon" propsName="TextHighlight">
  <div class="flex">
    <p>
      Adjust the <TextHighlight text="Scale" /> input to resize the map.
    </p>
  </div>
</Example>
<Spacer size="2rem" />

<Example title="In muted text" propsName="TextHighlight">
  <div class="flex">
    <Text size="sm" color="muted">
      Open the <TextHighlight text="Map" icon={IconMap} /> controls to adjust the scale.
    </Text>
  </div>
</Example>

<style>
  .flex {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
