<script lang="ts">
  import { Input, FormControl, Button, Title, Spacer, Panel } from '@tableslayer/ui';
  import { useAuthResetPasswordMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';
  import { Head } from '$lib/components';

  let { data } = $props();
  const { userDesiringReset, resetCode } = data;
  let password = $state('');
  let confirmPassword = $state('');
  let formIsLoading = $state(false);
  let resetPasswordError = $state<FormMutationError | undefined>(undefined);

  const resetPassword = useAuthResetPasswordMutation();

  const handleResetPassword = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () =>
        resetPassword.mutateAsync({
          email: userDesiringReset.email,
          password,
          confirmPassword,
          code: resetCode
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        resetPasswordError = error;
      },
      onSuccess: () => {
        goto('/profile');
      },
      toastMessages: {
        success: { title: 'Password reset' },
        error: { title: 'Error resetting password', body: (error) => error.message }
      }
    });
  };
</script>

<Head title="Reset your password" />

<Panel class="panel--signup">
  <Title as="h1" size="md">Reset your password</Title>
  <Spacer size="0.5rem" />
  <p>You will be logged in after successfully resetting your password</p>
  <Spacer size="2rem" />
  <form onsubmit={handleResetPassword}>
    <FormControl label="Password" name="password" errors={resetPasswordError && resetPasswordError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="password" bind:value={password} />
      {/snippet}
    </FormControl>
    <Spacer />
    <FormControl
      label="Confirm password"
      name="confirmPassword"
      errors={resetPasswordError && resetPasswordError.errors}
    >
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="password" bind:value={confirmPassword} />
      {/snippet}
    </FormControl>
    <Spacer />
    <Button type="submit" isLoading={formIsLoading} disabled={formIsLoading}>Submit</Button>
  </form>
</Panel>

<style>
  :global(.panel.panel--signup) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
