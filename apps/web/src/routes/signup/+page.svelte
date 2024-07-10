<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  import type { ActionData } from './$types';

  export let form: ActionData;
  if (form?.status === 200) {
    goto('/verify-email');
  }
</script>

<h1>Create an account</h1>
<form method="post" use:enhance>
  <label for="email">Email</label>
  <input name="email" id="email" /><br />
  <label for="password">Password</label>
  <input type="password" name="password" id="password" /><br />
  <button>Continue</button>
  <p>{form?.message ?? ''}</p>
</form>
<a href="/login">Sign in</a>
