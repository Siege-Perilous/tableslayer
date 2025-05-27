<script lang="ts">
  import { Input, InputCheckbox, FormError, Button, Title, Link, Spacer, Panel, FormControl } from '@tableslayer/ui';
  import { IllustrationOverlook, Head } from '$lib/components';
  import { useAuthSignupMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let signupError = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);
  let isChecked = $state(true);
  const signup = useAuthSignupMutation();

  const handleSignup = async (e: Event) => {
    e.preventDefault();
    if (!isChecked) {
      signupError = { success: false, status: 400, message: 'You must agree to the terms of service' };
      return;
    }
    await handleMutation({
      mutation: () => $signup.mutateAsync({ email, password, confirmPassword }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        signupError = error;
      },
      onSuccess: () => {
        goto('/verify-email');
      },
      toastMessages: {
        success: { title: 'Welcome to Table Slayer!' },
        error: { title: 'Error signing up', body: (error) => error.message }
      }
    });
  };
</script>

<Head title="Sign up" description="Sign up to Table Slayer" />

<IllustrationOverlook />

<Panel class="panel--signup">
  <Title as="h1" size="md">Create an account</Title>
  <Spacer size="0.5rem" />
  <p>Already have an account? <Link href="/login">Sign in</Link>.</p>
  <Spacer size="2rem" />
  <form onsubmit={handleSignup}>
    <FormControl label="Email" name="email" errors={signupError && signupError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="text" bind:value={email} data-testid="email" />
      {/snippet}
    </FormControl>
    <Spacer />
    <FormControl label="Password" name="password" errors={signupError && signupError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="password" bind:value={password} data-testid="password" />
      {/snippet}
    </FormControl>
    <Spacer />
    <FormControl label="Confirm Password" name="confirmPassword" errors={signupError && signupError.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="password" bind:value={confirmPassword} data-testid="confirmPassword" />
      {/snippet}
    </FormControl>
    <Spacer />
    <InputCheckbox bind:checked={isChecked} {label} />
    <Spacer />
    <Button type="submit" data-testid="signupSubmit" isLoading={formIsLoading} disabled={formIsLoading}>Submit</Button>
    <FormError error={signupError} />
  </form>
</Panel>

{#snippet label()}
  I agree to this (very readible) <Link href="/tos" target="_blank">terms of service</Link>
{/snippet}

<style>
  :global(.panel.panel--signup) {
    display: flex;
    flex-direction: column;
    max-width: 480px;
    padding: var(--size-8);
    margin: 20vh auto auto 10vh;
    position: relative;
    z-index: 5;
  }
  @media (max-width: 768px) {
    :global(.panel.panel--signup) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
