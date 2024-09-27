<script lang="ts">
  import { Panel } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Panel" propsName="Avatar">
  <Panel class="panelExample">hello</Panel>
</Example>

<style>
  :global(.panel.panelExample) {
    width: 200px;
    padding: var(--size-4);
    aspect-ratio: var(--ratio-widescreen);
  }
</style>
