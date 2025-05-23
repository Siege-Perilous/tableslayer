<script lang="ts">
  import { Spacer } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Spacer" propsName="Spacer" layout="column">
  <Spacer size="0.5rem" class="spacer--example" />
  <Spacer size="1rem" class="spacer--example" />
  <Spacer size="1.5rem" class="spacer--example" />
  <Spacer size="2rem" class="spacer--example" />
</Example>

<style>
  :global(.spacer--example) {
    width: 100%;
    background-color: var(--fg);
  }
</style>
