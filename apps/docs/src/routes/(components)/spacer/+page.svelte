<script lang="ts">
  import { Spacer } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Spacer" propsName="Spacer" layout="column">
  <Spacer size={2} class="spacer--example" />
  <Spacer size={4} class="spacer--example" />
  <Spacer size={6} class="spacer--example" />
  <Spacer size={8} class="spacer--example" />
</Example>

<style>
  :global(.spacer--example) {
    width: 100%;
    background-color: var(--fg);
  }
</style>
