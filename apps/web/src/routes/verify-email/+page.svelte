<script lang="ts">
  import { Button, FormControl, Input, Link, Panel, Spacer, Text, Title } from '@tableslayer/ui';
  import { IllustrationPortal, Head } from '$lib/components/index.js';
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
  let showPortal = $derived(verifyCode !== '');

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

  const handleCancelChangeEmail = (e: Event) => {
    e.preventDefault();
    isChangingEmail = false;
  };
</script>

<Head title="Verify your email" />

<IllustrationPortal {showPortal} />

<Panel class="verify">
  <div>
    {#if !isChangingEmail}
      {#if data.isVerified}
        <Title as="h1" size="md">Your email is verified</Title>
      {:else if data.isWithinExpiration}
        <Title as="h1" size="md">Check your email</Title>
        <Text>Enter the code sent to {data.user.email}</Text>
        <Spacer size={2} />
        <Link onclick={() => (isChangingEmail = true)}>Change email</Link>
        <Spacer size={8} />
        <form onsubmit={handleVerifyEmail}>
          <FormControl label="Verify code" name="code" errors={verifyEmailError && verifyEmailError.errors}>
            {#snippet input({ inputProps })}
              <Input {...inputProps} type="text" bind:value={verifyCode} hideAutocomplete />
            {/snippet}
          </FormControl>
          <Spacer />
          <Button type="submit" isLoading={formIsLoading} disabled={formIsLoading}>Verify</Button>
        </form>
      {:else}
        <div>
          <Title as="h1" size="md">Expired code</Title>
          <Text>Your previous verification code expired. Please request a new one.</Text>
          <Spacer />
          <Button onclick={handleResendEmail} isLoading={formIsLoading} disabled={formIsLoading}>
            Resend verification email
          </Button>
        </div>
      {/if}
    {:else}
      <form onsubmit={handleChangeEmail}>
        <FormControl label="New email" name="newEmail" errors={changeEmailError && changeEmailError.errors}>
          {#snippet input({ inputProps })}
            <Input {...inputProps} type="email" bind:value={newEmail} />
          {/snippet}
        </FormControl>
        <Spacer />
        <Button>Change email</Button>
        <Button variant="danger" isLoading={formIsLoading} disabled={formIsLoading} onclick={handleCancelChangeEmail}>
          Cancel
        </Button>
      </form>
    {/if}
  </div>
</Panel>

<style>
  :global(.panel.verify) {
    display: flex;
    flex-direction: column;
    max-width: 360px;
    padding: var(--size-8);
    margin: 10vh auto auto 10vh;
    position: relative;
    z-index: 5;
  }
  @media (max-width: 768px) {
    :global(.panel.verify) {
      margin: 3rem auto auto auto;
    }
  }
</style>
