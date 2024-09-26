<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field, FieldErrors } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { loginSchema } from '$lib/schemas';
  import { Input, Button, Control } from '@tableslayer/ui';

  let { data } = $props();
  const form = superForm(data.loginForm, {
    validators: zodClient(loginSchema),
    resetForm: true
  });
  const { form: formData, enhance, message } = form;
</script>

<h1>Sign in</h1>
<form method="POST" action="?/login" use:enhance>
  <Field {form} name="email">
    <Control label="Email">
      {#snippet children({ attrs })}
        <Input {...attrs} type="email" bind:value={$formData.email} />
      {/snippet}
    </Control>
    <FieldErrors />
  </Field>
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
  <Button>Log in</Button>
</form>
<a href="/signup">Create an account</a>
<SuperDebug data={$formData} />
