<script lang="ts">
  import { enhance } from '$app/forms';
  let { form, data } = $props();
  let isChangingEmail = $state(false);
</script>

<h1>Verify email</h1>

{#if !isChangingEmail}
  <p>{data.user?.email} <button onclick={() => (isChangingEmail = true)}>change</button></p>

  {#if data.isVerified}
    <p>Email is already verified</p>
  {:else if data.isWithinExpiration}
    <form method="post" action="?/verify" use:enhance>
      <label for="code">Verify code</label>
      <input type="text" name="code" id="code" required /><br />
      <button>Continue</button>
      <p>
        {form?.status}
        {form?.message ?? ''}
      </p>
    </form>
  {:else}
    Your previous verification code expired. Please request a new one.
    <form method="post" action="?/resend" use:enhance>
      <button>Resend</button>
      <p>
        {form?.status}
        {form?.message ?? ''}
      </p>
    </form>
  {/if}
{:else}
  <form method="post" action="?/changeEmail" use:enhance>
    <label for="email">New email</label>
    <input type="email" name="email" id="email" required /><br />
    <button>Change email</button>
    <button onclick={() => (isChangingEmail = false)}>Cancel</button>
    <p>
      {form?.status}
      {form?.message ?? ''}
    </p>
  </form>
{/if}
