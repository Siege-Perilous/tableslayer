<script lang="ts">
  import { addToast, Input, FormControl, Button, Title, Spacer, Panel } from '@tableslayer/ui';
  import { useAuthResetPasswordMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';

  let { data } = $props();
  const { userDesiringReset, resetCode } = data;
  let password = $state('');
  let confirmPassword = $state('');
  let formIsLoading = $state(false);
  let resetPasswordError = $state<FormMutationError | undefined>(undefined);

  const resetPassword = useAuthResetPasswordMutation();

  const handleResetPassword = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $resetPassword.mutateAsync({
        email: userDesiringReset.email,
        password,
        confirmPassword,
        code: resetCode
      });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Password reset',
          type: 'success'
        }
      });
      goto('/profile');
    } catch (e) {
      resetPasswordError = e as FormMutationError;
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error resetting password',
          body: resetPasswordError.message,
          type: 'danger'
        }
      });
    }
  };
</script>

<Panel class="panel--signup">
  <Title as="h1" size="md">Reset your password</Title>
  <Spacer size={2} />
  <p>You will be logged in after successfully resetting your password</p>
  <Spacer size={8} />
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
