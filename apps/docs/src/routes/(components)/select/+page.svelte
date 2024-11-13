<script lang="ts">
  import { Select } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  const options = ['Option 1', 'Option 2', 'Option 3'];
  const optionsWithGroups = {
    'Group 1': ['Option 1', 'Option 2'],
    'Group 2': ['Option 3', 'Option 4']
  };
</script>

<Example title="Avatar" propsName="Avatar">
  <Select {options} />
  <Select options={optionsWithGroups} />
</Example>
