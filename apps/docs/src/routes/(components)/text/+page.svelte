<script lang="ts">
  import { Text } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Text" propsName="Text" layout="column">
  <Text size="0.875rem">Smaller text</Text>
  <Text weight={600} color="var(--fgDanger)">bold danger text</Text>
</Example>
