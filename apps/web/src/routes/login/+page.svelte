<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field, Control, Label, FieldErrors } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { loginSchema } from '$lib/schemas';

  let { data } = $props();
  const form = superForm(data.loginForm, {
    validators: zodClient(loginSchema),
    resetForm: true
  });
  const { form: formData, enhance, message } = form;
  console.log(message);
</script>

<h1>Sign in</h1>
<form method="POST" action="?/login" use:enhance>
  <Field {form} name="email">
    <Control let:attrs>
      <Label>Email</Label>
      <input {...attrs} type="email" bind:value={$formData.email} />
    </Control>
    <FieldErrors />
  </Field>
  <Field {form} name="password">
    <Control let:attrs>
      <Label>password</Label>
      <input {...attrs} type="password" bind:value={$formData.password} />
    </Control>
    <FieldErrors />
  </Field>
  {#if $message}
    <p>{$message}</p>
  {/if}
  <button>Submit</button>
</form>
<a href="/signup">Create an account</a>
<SuperDebug data={$formData} />
