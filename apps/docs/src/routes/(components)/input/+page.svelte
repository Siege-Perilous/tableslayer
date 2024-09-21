<script lang="ts">
  import { Button, Input, Label } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Input" propsName="Input">
  <Input placeholder="Hello I am an input" type="text" />
  <Button>Submit</Button>
</Example>

<Example title="Input with label" propsName="Input">
  <Label id="input">Input</Label>
  <Input id="input" placeholder="Hello I am an input" type="text" />
</Example>
