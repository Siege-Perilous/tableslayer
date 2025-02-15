<script lang="ts">
  import { Button, FormControl, Input } from '@tableslayer/ui';
  import {
    useAuthVerifyEmailMutation,
    useAuthResendVerificationEmailMutation,
    useAuthChangeEmailMutation
  } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';

  let { data } = $props();
  const { user } = data;

  let isChangingEmail = $state(false);
  let formIsLoading = $state(false);
  let newEmail = $state('');
  let verifyCode = $state('');
  let verifyEmailError = $state<FormMutationError | undefined>(undefined);
  let changeEmailError = $state<FormMutationError | undefined>(undefined);

  const verifyEmail = useAuthVerifyEmailMutation();
  const resendEmail = useAuthResendVerificationEmailMutation();
  const changeEmail = useAuthChangeEmailMutation();

  const handleVerifyEmail = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $verifyEmail.mutateAsync({ code: verifyCode }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        verifyEmailError = error;
      },
      onSuccess: () => {
        goto('/login');
      },
      toastMessages: {
        success: { title: 'Email verified' },
        error: { title: 'Error verifying email', body: (error) => error.message }
      }
    });
  };

  const handleResendEmail = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $resendEmail.mutateAsync({ userId: user.id }),
      formLoadingState: (loading) => (formIsLoading = loading),
      toastMessages: {
        success: { title: 'Verification email resent' },
        error: { title: 'Error resending verification email', body: (error) => error.message }
      }
    });
  };

  const handleChangeEmail = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $changeEmail.mutateAsync({ newEmail }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        changeEmailError = error;
      },
      onSuccess: () => {
        isChangingEmail = false;
      },
      toastMessages: {
        success: { title: 'Email changed' },
        error: { title: 'Error changing email', body: (error) => error.message }
      }
    });
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
