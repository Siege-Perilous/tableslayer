<script lang="ts">
  import { Title } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Loader" propsName="Title">
  <div class="flex">
    <Title size="xs" as="h3">Extra small</Title>
    <Title size="sm" as="h3">Small</Title>
    <Title size="md" as="h3">Medium</Title>
    <Title size="lg" as="h3">Large</Title>
    <Title size="xl" as="h3">Extra large</Title>
  </div>
</Example>

<style>
  .flex {
    display: flex;
    gap: var(--size-4);
    flex-direction: column;
  }
</style>
