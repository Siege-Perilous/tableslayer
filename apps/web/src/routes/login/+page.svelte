<script lang="ts">
  import { useAuthLoginMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';
  import { FormError, Input, Button, FormControl, Title, Link, Text, Spacer, Panel } from '@tableslayer/ui';
  import { IllustrationTown, Head } from '$lib/components';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  let { data } = $props();
  const { isGoogleOAuthEnabled, isEmailEnabled } = $derived(data);

  let email = $state('');
  let password = $state('');
  let formIsLoading = $state(false);
  let loginErrors = $state<FormMutationError | undefined>(undefined);

  // Check for OAuth error on mount
  onMount(() => {
    if (page.url.searchParams.get('error') === 'oauth_failed') {
      loginErrors = {
        success: false,
        status: 500,
        message: 'Failed to sign in with Google. Please try again or use email/password.'
      };
    }
  });

  const login = useAuthLoginMutation();

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => login.mutateAsync({ email, password }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        loginErrors = error;
      },
      onSuccess: async () => {
        // Reload the current page to let the server handle the redirect
        // Using invalidateAll to force the load function to re-run
        await invalidateAll();
      },
      toastMessages: {
        success: { title: 'Welcome back!' },
        error: { title: 'Error logging in', body: (error) => error.message }
      }
    });
  };
</script>

<Head title="Sign in" description="Sign in to Table Slayer" />

<IllustrationTown bucketUrl={data.bucketUrl} />

<Panel class="login">
  <Title as="h1" size="md" data-testid="signInHeading">Sign in</Title>
  <Spacer />
  {#if isGoogleOAuthEnabled && data.envName !== 'preview'}
    <div>
      <Button href="/login/google" data-sveltekit-preload-data="tap">
        {#snippet start()}
          <img src="/google.svg" alt="Google logo" width="16" height="16" />
        {/snippet}
        Continue with Google
      </Button>
    </div>
    <Spacer />
    <div class="login__divider">
      <span>or</span>
    </div>
    <Spacer />
  {/if}
  <form onsubmit={handleLogin}>
    <FormControl label="Email" name="email" errors={loginErrors && loginErrors.errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="email" bind:value={email} data-testid="email" />
      {/snippet}
    </FormControl>
    <Spacer />
    <FormControl label="Password" name="password" errors={loginErrors && loginErrors.errors}>
      {#snippet input({ inputProps })}
        <Input type="password" {...inputProps} bind:value={password} data-testid="password" />
      {/snippet}
    </FormControl>
    <Spacer />
    <Button data-testid="loginSubmit" disabled={formIsLoading}>Sign in</Button>
    <FormError error={loginErrors} />
  </form>
  <Spacer />
  <Text>
    Need an account? <Link href="/signup">Sign up now</Link>{#if isEmailEnabled}
      or <Link href="/forgot-password">recover your password</Link>{/if}.
  </Text>
</Panel>

<style>
  :global(.panel.login) {
    display: flex;
    flex-direction: column;
    max-width: 480px;
    padding: var(--size-8);
    margin: 20vh auto auto 10vh;
    position: relative;
    z-index: 5;
    @media (max-width: 768px) {
      margin: 3rem 3rem auto 3rem;
    }
  }

  .login__divider {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .login__divider::before,
  .login__divider::after {
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
</style>
