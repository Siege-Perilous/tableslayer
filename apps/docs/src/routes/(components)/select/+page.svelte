<script lang="ts">
  import { Select } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  const options = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
    { label: 'Option 4', value: 'option4' }
  ];
  const optionsWithGroups = {
    'Group 1': [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' }
    ],
    'Group 2': [
      { label: 'Option 3', value: 'option3' },
      { label: 'Option 4', value: 'option4' }
    ]
  };
</script>

<Example title="Avatar" propsName="Avatar">
  <Select {options} />
  <Select options={optionsWithGroups} />
</Example>
