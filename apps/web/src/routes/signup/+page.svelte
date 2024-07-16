<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field, Control, Label, FieldErrors } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { signupSchema } from '$lib/schemas';

  let { data } = $props();
  const form = superForm(data.signupForm, {
    validators: zodClient(signupSchema)
  });

  const { form: formData, enhance, message } = form;
</script>

<h1>Create an account</h1>
<form method="post" use:enhance>
  <Field {form} name="email">
    <Control let:attrs>
      <Label>Email</Label>
      <input {...attrs} type="text" bind:value={$formData.email} />
    </Control>
    <FieldErrors />
  </Field>
  <Field {form} name="password">
    <Control let:attrs>
      <Label>Password</Label>
      <input {...attrs} type="password" bind:value={$formData.password} />
    </Control>
    <FieldErrors />
  </Field>
  <Field {form} name="confirmPassword">
    <Control let:attrs>
      <Label>Confirm Password</Label>
      <input {...attrs} type="password" bind:value={$formData.confirmPassword} />
    </Control>
    <FieldErrors />
  </Field>
  {#if $message}
    <p>{$message}</p>
  {/if}
  <button type="submit">Submit</button>
</form>
<a href="/login">Already have an account?</a>
<SuperDebug data={$formData} />
