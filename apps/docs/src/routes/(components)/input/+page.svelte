<script lang="ts">
  import { Button, DualInputSlider, Input, Spacer, FormControl, InputSlider } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="InputSlider" propsName="InputSlider">
  <InputSlider />
  <InputSlider hex="blue" />
</Example>

<Example title="DualInputSlider" propsName="DualInputSlider">
  <DualInputSlider step={0.05} min={0.1} max={1} valueStart={0.1} valueEnd={0.8} />
  <DualInputSlider step={0.05} min={0.1} max={1} valueStart={0.1} valueEnd={0.8} color="#FC0000" />
</Example>

<Example title="Input" propsName="Input">
  <Input id="first" placeholder="Hello I am an input" type="text" />
  <Button>Submit</Button>
</Example>

<Spacer size={8} />

<Example title="Input with label" propsName="Label">
  <FormControl label="First Name" name="firstName">
    {#snippet input({ inputProps })}
      <Input {...inputProps} placeholder="Dave" type="text" />
    {/snippet}
  </FormControl>
</Example>

<Example title="Input with start / end props" propsName="Label">
  <FormControl label="First Name" name="firstName">
    {#snippet start()}
      start
    {/snippet}
    {#snippet input({ inputProps })}
      <Input {...inputProps} placeholder="Dave" type="text" />
    {/snippet}
    {#snippet end()}
      end
    {/snippet}
  </FormControl>
</Example>
