<script lang="ts">
  import { Button, Input, Label, Field } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Input" propsName="Input">
  <Input id="first" placeholder="Hello I am an input" type="text" />
  <Button>Submit</Button>
</Example>

<Example title="Input with label" propsName="Label">
  <Label id="input">Input</Label>
  <Input id="input" placeholder="Hello I am an input" type="text" />
</Example>

<Example title="Field" propsName="Field">
  <Field label="Input" id="test" type="text" placeholder="Hello I am an input" />
</Example>
