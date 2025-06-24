<script lang="ts">
  import {
    Input,
    InputCheckbox,
    FormError,
    Button,
    Title,
    Link,
    Spacer,
    Panel,
    FormControl,
    ColorMode,
    Text,
    Hr
  } from '@tableslayer/ui';
  import { mode } from 'mode-watcher';
  import { IllustrationOverlook, Head } from '$lib/components';
  import { useAuthSignupMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';

  let { data } = $props();

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
  <Spacer />
  {#if data.envName !== 'preview'}
    <div>
      <ColorMode mode={mode.current === 'dark' ? 'light' : 'dark'}>
        <Button href="/login/google" data-sveltekit-preload-data="tap">
          {#snippet start()}
            <img src="/google.svg" alt="Google logo" width="16" height="16" />
          {/snippet}
          Continue with Google
        </Button>
      </ColorMode>
    </div>

    <Spacer />
    <div class="signup__divider">
      <span>or</span>
    </div>
    <Spacer />
  {/if}
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
  <Spacer size="2rem" />
  <Text>
    Already have an account? <Link href="/login">Sign in</Link>.
  </Text>
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

  .signup__divider {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .signup__divider::before,
  .signup__divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--contrastMedium);
  }

  .login__divider span {
    padding: 0 1rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 500;
  }
  @media (max-width: 768px) {
    :global(.panel.panel--signup) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
