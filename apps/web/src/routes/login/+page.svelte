<script lang="ts">
  import { useAuthLogin } from '$lib/queries';
  import type { FormMutationError } from '$lib/factories';
  import { goto } from '$app/navigation';
  import { addToast, Input, Button, FormControl, Title, Link, Text, Spacer, Panel } from '@tableslayer/ui';
  import { IllustrationTown } from '$lib/components';
  let email = $state('');
  let password = $state('');
  let formIsLoading = $state(false);
  let loginErrors = $state<FormMutationError | undefined>(undefined);

  const login = useAuthLogin();

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $login.mutateAsync({ email, password });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Welcome back!',
          type: 'success'
        }
      });
      goto('/profile');
    } catch (e) {
      loginErrors = e as FormMutationError;
      formIsLoading = false;
      addToast({
        data: {
          title: 'Error logging in',
          body: loginErrors.message,
          type: 'danger'
        }
      });
    }
  };
</script>

<IllustrationTown />

<Panel class="login">
  <Title as="h1" size="md" data-testid="signInHeading">Sign in</Title>
  <Spacer size={2} />
  <Text>
    <Link href="/signup">Create a new account</Link> or <Link href="/forgot-password">recover your password</Link>.
  </Text>
  <Spacer size={8} />
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
  </form>
  <Spacer />
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
  }
  @media (max-width: 768px) {
    :global(.panel.panel--login) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
