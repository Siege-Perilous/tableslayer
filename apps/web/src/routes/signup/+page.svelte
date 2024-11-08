<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { signupSchema } from '$lib/schemas';
  import { Input, MessageError, Button, Control, FieldErrors, Title, Link, Spacer, Panel } from '@tableslayer/ui';

  let { data } = $props();
  const form = superForm(data.signupForm, {
    validators: zodClient(signupSchema)
  });

  const { form: formData, enhance, message } = form;
</script>

<Panel class="panel--signup">
  <Title as="h1" size="md">Create an account</Title>
  <Spacer size={2} />
  <p>Already have an account? <Link href="/login">Sign in</Link>.</p>
  <Spacer size={8} />
  <form method="post" use:enhance>
    <Field {form} name="email">
      <Control label="Email">
        {#snippet children({ attrs })}
          <Input {...attrs} type="text" bind:value={$formData.email} />
        {/snippet}
      </Control>
      <FieldErrors />
    </Field>
    <Spacer />
    <Field {form} name="password">
      <Control label="Password">
        {#snippet children({ attrs })}
          <Input {...attrs} type="password" bind:value={$formData.password} />
        {/snippet}
      </Control>
      <FieldErrors />
    </Field>
    <Spacer />
    <Field {form} name="confirmPassword">
      <Control label="Confirm Password">
        {#snippet children({ attrs })}
          <Input {...attrs} type="password" bind:value={$formData.confirmPassword} />
        {/snippet}
      </Control>
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
  :global(.panel.panel--signup) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
