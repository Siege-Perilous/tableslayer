<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { resetPasswordSchema } from '$lib/schemas';
  import { Input, MessageError, Button, FSControl, FieldErrors, Title, Spacer, Panel } from '@tableslayer/ui';

  let { data } = $props();
  const { userDesiringReset } = data;
  const form = superForm(data.resetPasswordForm, {
    validators: zodClient(resetPasswordSchema)
  });

  const { form: formData, enhance, message } = form;
</script>

<Panel class="panel--signup">
  <Title as="h1" size="md">Reset your password</Title>
  <Spacer size={2} />
  <p>You will be logged in after successfully resetting your password</p>
  <Spacer size={8} />
  <form method="post" use:enhance>
    <Field {form} name="password">
      <FSControl label="Password">
        {#snippet content({ props })}
          <Input {...props} type="password" bind:value={$formData.password} />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    <Spacer />
    <Field {form} name="confirmPassword">
      <FSControl label="Confirm password">
        {#snippet content({ props })}
          <Input {...props} type="password" bind:value={$formData.confirmPassword} />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    {#if $message}
      <Spacer />
      <MessageError message={$message} />
    {/if}
    <Spacer />
    <Field {form} name="userId">
      <FSControl>
        {#snippet content({ props })}
          <Input {...props} type="hidden" name="userId" value={userDesiringReset.id} />
        {/snippet}
      </FSControl>
    </Field>
    <Button type="submit">Submit</Button>
    <Spacer />
  </form>
</Panel>
<SuperDebug data={$formData} display={false} />

<style>
  :global(.panel.panel--signup) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
