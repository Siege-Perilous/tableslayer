<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { loginSchema } from '$lib/schemas';
  import { Input, Button, Control, FieldErrors, Title, Link, Spacer } from '@tableslayer/ui';

  let { data } = $props();
  const form = superForm(data.loginForm, {
    validators: zodClient(loginSchema),
    resetForm: true
  });
  const { form: formData, enhance, message } = form;
</script>

<div class="login">
  <Title as="h1" size="lg">Sign in</Title>
  <Spacer size={2} />
  <p>Don't have an account? <Link href="/signup">Create an account</Link>.</p>
  <Spacer size={8} />
  <form method="POST" action="?/login" use:enhance>
    <Field {form} name="email">
      <Control label="Email">
        {#snippet children({ attrs })}
          <Input {...attrs} type="email" bind:value={$formData.email} />
        {/snippet}
      </Control>
      <FieldErrors />
    </Field>
    <Spacer />
    <Field {form} name="password">
      <Control label="Password">
        {#snippet children({ attrs })}
          <Input type="password" {...attrs} bind:value={$formData.password} />
        {/snippet}
      </Control>
      <FieldErrors />
    </Field>
    {#if $message}
      <p>{$message.text}</p>
    {/if}
    <Spacer />
    <Button>Sign in</Button>
  </form>
  <Spacer />
</div>
<SuperDebug data={$formData} display={false} />

<style>
  .login {
    display: flex;
    flex-direction: column;
    max-width: 400px;
    padding: var(--size-8);
    border-radius: var(--radius-2);
    border: var(--border-1);
    margin: 20vh auto auto auto;
  }
</style>
