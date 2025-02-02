<script lang="ts">
  import { Input, addToast, Button, FormControl, Title, Spacer, Panel } from '@tableslayer/ui';
  import { useAuthForgotPasswordMutation } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';
  let email = $state('');
  let formIsLoading = $state(false);
  let forgotPasswordError = $state<FormMutationError | undefined>(undefined);

  const forgotPassword = useAuthForgotPasswordMutation();
  const handleForgotPassword = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $forgotPassword.mutateAsync({ email });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Check your email',
          type: 'success'
        }
      });
      goto('/forgot-password/confirm');
    } catch (e) {
      forgotPasswordError = e as FormMutationError;
      formIsLoading = false;
      console.log(forgotPasswordError);
      addToast({
        data: {
          title: 'Error sending password reset email',
          body: forgotPasswordError.message,
          type: 'danger'
        }
      });
    }
  };
</script>

<Panel class="panel--forgot">
  <Title as="h1" size="md">Forgot password?</Title>
  <Spacer size={8} />
  <form onsubmit={handleForgotPassword}>
    <FormControl label="Email" name="email" errors={forgotPasswordError && forgotPasswordError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="text" bind:value={email} />
      {/snippet}
    </FormControl>
    <Spacer />
    <Button type="submit" isLoading={formIsLoading} disabled={formIsLoading}>Submit</Button>
  </form>
</Panel>

<style>
  :global(.panel.panel--forgot) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
