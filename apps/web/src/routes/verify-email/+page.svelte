<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;
  export let data;
</script>

<h1>Verify email</h1>
<p>is verified: {data.isVerified}</p>
<p>within experation: {data.isWithinExpiration}</p>
{#if data.isVerified}
  <p>Email is already verified</p>
{:else}
  <form method="post" action="?/verify" use:enhance>
    <label for="code">Verify code</label>
    <input type="text" name="code" id="code" required /><br />
    <button>Continue</button>
    <p>
      {form?.status}
      {form?.message ?? ''}
    </p>
  </form>
{/if}
