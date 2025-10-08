<script lang="ts">
  import { Input, Button, FormControl, Title, Spacer, Panel, Text, Link } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { useAuthForgotPasswordMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';

  let { data } = $props();
  const { isEmailEnabled } = $derived(data);

  let email = $state('');
  let formIsLoading = $state(false);
  let forgotPasswordError = $state<FormMutationError | undefined>(undefined);

  const forgotPassword = useAuthForgotPasswordMutation();
  const handleForgotPassword = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $forgotPassword.mutateAsync({ email }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        forgotPasswordError = error;
      },
      onSuccess: () => {
        goto('/forgot-password/confirm');
      },
      toastMessages: {
        success: { title: 'Check your email' },
        error: { title: 'Error sending password reset email', body: (error) => error.message }
      }
    });
  };
</script>

<Head title="Forgot password" description={`Retrieve your password on Table Slayer`} />

<Panel class="panel--forgot">
  <Title as="h1" size="md">Forgot password?</Title>
  <Spacer size="2rem" />
  {#if !isEmailEnabled}
    <Text>Password reset is not available on this server because email service is not configured.</Text>
    <Spacer />
    <Text>
      Please contact your server administrator. Return to <Link href="/login">sign in</Link>.
    </Text>
  {:else}
    <form onsubmit={handleForgotPassword}>
      <FormControl label="Email" name="email" errors={forgotPasswordError && forgotPasswordError.errors}>
        {#snippet input({ inputProps })}
          <Input {...inputProps} type="text" bind:value={email} />
        {/snippet}
      </FormControl>
      <Spacer />
      <Button type="submit" isLoading={formIsLoading} disabled={formIsLoading}>Submit</Button>
    </form>
  {/if}
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
