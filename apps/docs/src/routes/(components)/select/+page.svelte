<script lang="ts">
  import { Select } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import type { Snippet } from 'svelte';
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

{#snippet labelOne()}
  <div style="background: yellow">hello</div>
{/snippet}

<Example title="Avatar" propsName="Avatar">
  <Select
    options={[
      { label: labelOne as Snippet, value: 'option1' },
      { label: 'Option 2', value: 'option2' },
      { label: 'Option 3', value: 'option3' },
      { label: 'Option 4', value: 'option4' }
    ]}
    selected={[]}
  />
  <Select options={optionsWithGroups} multiple={true} selected={['option3']} />
</Example>
