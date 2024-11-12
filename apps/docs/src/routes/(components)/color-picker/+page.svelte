<script lang="ts">
  import { ColorPicker, Input } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import { onMount } from 'svelte';
  let hex = $state('#ff0000ff');
  let hexInputValue = $state('');
  let hexInputError = $state('');

  onMount(() => {
    hexInputValue = hex;
  });

  const handleColorUpdate = (colorData) => {
    hexInputValue = colorData.hex;
    hexInputError = '';
  };
  const handleHexInputBlur = () => {
    if (/^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hexInputValue)) {
      hex = hexInputValue.startsWith('#') ? hexInputValue : `#${hexInputValue}`;
      hexInputError = '';
    } else {
      const oldHex = hexInputValue;
      hexInputError = `${oldHex} is not an acceptable hex code`;
      hexInputValue = hex;
    }
  };
</script>

<Example title="ColorPicker" propsName="ColorPicker" layout="column">
  <Input type="text" bind:value={hexInputValue} onblur={handleHexInputBlur} />
  {#if hexInputError}
    <small>{hexInputError}</small>
  {/if}
  <ColorPicker bind:hex onUpdate={handleColorUpdate} />
</Example>
