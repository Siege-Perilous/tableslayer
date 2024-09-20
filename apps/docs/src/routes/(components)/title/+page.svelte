<script lang="ts">
  import { Title } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Loader" propsName="Title">
  <div class="flex">
    <Title size="xs">Extra small</Title>
    <Title size="sm">Small</Title>
    <Title size="md">Medium</Title>
    <Title size="lg">Large</Title>
    <Title size="xl">Extra large</Title>
  </div>
</Example>

<style>
  .flex {
    display: flex;
    gap: var(--size-4);
    flex-direction: column;
  }
</style>
