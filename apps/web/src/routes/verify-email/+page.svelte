<script lang="ts">
  import { addToast, Button, FormControl, Input } from '@tableslayer/ui';
  import {
    useAuthVerifyEmailMutation,
    useAuthResendVerificationEmailMutation,
    useAuthChangeEmailMutation
  } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';

  let { data } = $props();
  const { user } = data;

  let isChangingEmail = $state(false);
  let formIsLoading = $state(false);
  let newEmail = $state('');
  let verifyCode = $state('');
  let verifyEmailError = $state<FormMutationError | undefined>(undefined);
  let resendEmailError = $state<FormMutationError | undefined>(undefined);
  let changeEmailError = $state<FormMutationError | undefined>(undefined);

  const verifyEmail = useAuthVerifyEmailMutation();
  const resendEmail = useAuthResendVerificationEmailMutation();
  const changeEmail = useAuthChangeEmailMutation();

  const handleVerifyEmail = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $verifyEmail.mutateAsync({ code: verifyCode });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Email verified',
          type: 'success'
        }
      });
      goto('/profile');
    } catch (e) {
      verifyEmailError = e as FormMutationError;
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error verifying email',
          body: verifyEmailError.message,
          type: 'danger'
        }
      });
    }
  };

  const handleResendEmail = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $resendEmail.mutateAsync({ userId: user.id });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Verification email resent',
          type: 'success'
        }
      });
    } catch (e) {
      resendEmailError = e as FormMutationError;
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error resending verification email',
          body: resendEmailError.message,
          type: 'danger'
        }
      });
    }
  };

  const handleChangeEmail = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $changeEmail.mutateAsync({ newEmail });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Email changed',
          type: 'success'
        }
      });
      isChangingEmail = false;
    } catch (e) {
      changeEmailError = e as FormMutationError;
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error changing email',
          body: changeEmailError.message,
          type: 'danger'
        }
      });
    }
  };
</script>

<h1>Verify email</h1>

{#if !isChangingEmail}
  <p>{data.user?.email} <button type="button" onclick={() => (isChangingEmail = true)}>Change</button></p>

  {#if data.isVerified}
    <p>Email is already verified</p>
  {:else if data.isWithinExpiration}
    <form onsubmit={handleVerifyEmail}>
      <FormControl label="Verify code" name="code" errors={verifyEmailError && verifyEmailError.errors}>
        {#snippet input({ inputProps })}
          <Input {...inputProps} type="text" bind:value={verifyCode} />
        {/snippet}
      </FormControl>
      <Button type="submit" isLoading={formIsLoading} disabled={formIsLoading}>Verify</Button>
    </form>
  {:else}
    <p>Your previous verification code expired. Please request a new one.</p>
    <Button onclick={handleResendEmail} isLoading={formIsLoading} disabled={formIsLoading}
      >Resend verification email</Button
    >
  {/if}
{:else}
  <form onsubmit={handleChangeEmail}>
    <FormControl label="New email" name="newEmail" errors={changeEmailError && changeEmailError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="email" bind:value={newEmail} />
      {/snippet}
    </FormControl>
    <button>Change email</button>
    <Button type="button" isLoading={formIsLoading} disabled={formIsLoading} onclick={() => (isChangingEmail = false)}
      >Cancel</Button
    >
  </form>
{/if}
