<script lang="ts">
  import { Button, CodeBlock, Spacer, type ToastData } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import { addToast } from '@tableslayer/ui';
  const example = `

const invokeToast = () => {
  addToast({
    data: {
      title: 'Hello',
      body: 'This is a toast',
      type: 'red'
    }
  });
};

<Button onclick={invokeToast}>Invoke toast</Button>
`;

  const invokeToast = () => {
    const randomToasts: ToastData[] = [
      {
        title: 'Success',
        body: 'This is a success toast',
        type: 'success'
      },
      {
        title: 'Info',
        body: 'This is an info toast',
        type: 'info'
      },
      {
        title: 'Danger',
        body: 'This is a danger toast',
        type: 'danger'
      }
    ];
    addToast({
      data: randomToasts[Math.floor(Math.random() * randomToasts.length)]
    });
  };
</script>

<Example title="Button" propsName="Button" layout="column">
  {#snippet codeBlock()}
    <CodeBlock code={example} lang="svelte" />
  {/snippet}
  <Button onclick={invokeToast}>Invoke toast</Button>
</Example>

<Spacer size={8} />
