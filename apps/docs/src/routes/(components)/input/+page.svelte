<script lang="ts">
  import { Button, Input, Spacer, Control } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Input" propsName="Input">
  <Input id="first" placeholder="Hello I am an input" type="text" />
  <Button>Submit</Button>
</Example>

<Spacer size={8} />

<Example title="Input with label" propsName="Label">
  <Control label="First Name">
    <Input placeholder="Dave" type="text" />
  </Control>
</Example>
