<script lang="ts">
  import { ColorPicker, Spacer, ColorPickerSwatch, Input } from '@tableslayer/ui';
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

<Example title="ColorPicker with inputs" propsName="ColorPicker" layout="column">
  <div>
    <ColorPicker bind:hex onUpdate={handleColorUpdate} />
  </div>
</Example>

<Spacer size={12} />

<Example title="ColorPicker with inputs" propsName="ColorPicker" layout="column">
  <div>
    <ColorPicker bind:hex onUpdate={handleColorUpdate} showInputs={true} />
  </div>
</Example>

<Spacer size={12} />

<Example title="ColorPicker controlled from outside" propsName="ColorPicker" layout="column">
  <div>
    <div class="cpExample">
      <ColorPickerSwatch color={hex} />
      <Input type="text" bind:value={hexInputValue} onblur={handleHexInputBlur} />
    </div>
    {#if hexInputError}
      <small>{hexInputError}</small>
    {/if}
    <Spacer />
    <ColorPicker bind:hex onUpdate={handleColorUpdate} />
  </div>
</Example>

<style>
  .cpExample {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
</style>
