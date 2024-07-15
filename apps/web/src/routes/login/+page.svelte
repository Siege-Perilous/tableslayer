<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  let { data } = $props();
  const { form, enhance, message } = superForm(data.loginForm, {
    resetForm: true
  });
</script>

<h1>Sign in</h1>
<form method="POST" action="?/login" use:enhance>
  E-mail: <input name="email" type="email" bind:value={$form.email} />
  Password:
  <input name="password" type="password" bind:value={$form.password} />
  {#if $message}<h3>{$message}</h3>{/if}
  <button>Submit</button>
</form>
<a href="/signup">Create an account</a>
