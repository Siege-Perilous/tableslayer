<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { forgotPasswordSchema } from '$lib/schemas';
  import { Input, MessageError, Button, FSControl, FieldErrors, Title, Spacer, Panel } from '@tableslayer/ui';

  let { data } = $props();
  const form = superForm(data.forgotPasswordForm, {
    validators: zodClient(forgotPasswordSchema)
  });

  const { form: formData, enhance, message } = form;
</script>

<Panel class="panel--forgot">
  <Title as="h1" size="md">Forgot password?</Title>
  <Spacer size={8} />
  <form method="post" use:enhance>
    <Field {form} name="email">
      <FSControl label="Email">
        {#snippet content({ props })}
          <Input {...props} type="text" bind:value={$formData.email} />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    {#if $message}
      <Spacer />
      <MessageError message={$message} />
    {/if}
    <Spacer />
    <Button type="submit">Submit</Button>
  </form>
</Panel>
<SuperDebug data={$formData} display={false} />

<style>
  :global(.panel.panel--forgot) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
