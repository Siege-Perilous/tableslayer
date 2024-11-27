<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug from 'sveltekit-superforms';
  import { loginSchema } from '$lib/schemas';
  import {
    Input,
    MessageError,
    Button,
    FSControl,
    FieldErrors,
    Title,
    Link,
    Text,
    Spacer,
    Panel
  } from '@tableslayer/ui';

  let { data } = $props();
  const form = superForm(data.loginForm, {
    validators: zodClient(loginSchema),
    resetForm: true
  });
  const { form: formData, enhance, message } = form;
</script>

<div class="bg">
  <Panel class="login">
    <Title as="h1" size="md" data-testid="signInHeading">Sign in</Title>
    <Spacer size={2} />
    <Text>
      <Link href="/signup">Create a new account</Link> or <Link href="/forgot-password">recover your password</Link>.
    </Text>
    <Spacer size={8} />
    <form method="POST" action="?/login" use:enhance>
      <Field {form} name="email">
        <FSControl label="Email">
          {#snippet children({ attrs })}
            <Input {...attrs} type="email" bind:value={$formData.email} />
          {/snippet}
        </FSControl>
        <FieldErrors />
      </Field>
      <Spacer />
      <Field {form} name="password">
        <FSControl label="Password">
          {#snippet children({ attrs })}
            <Input type="password" {...attrs} bind:value={$formData.password} />
          {/snippet}
        </FSControl>
        <FieldErrors />
      </Field>
      {#if $message}
        <MessageError message={$message} />
      {/if}
      <Spacer />
      <Button data-testid="loginSubmit">Sign in</Button>
    </form>
    <Spacer />
  </Panel>
  <SuperDebug data={$formData} display={false} />
</div>

<style>
  :global(.panel.login) {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 15vh auto auto auto;
  }
  .bg {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .bg::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: url('/skulls.png');
    background-size: cover;
    background-position: center;
    z-index: 0;
    opacity: 0.1;
  }
</style>
