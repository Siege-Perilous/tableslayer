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
  import { IllustrationTown } from '$lib/components';

  let { data } = $props();
  const form = superForm(data.loginForm, {
    validators: zodClient(loginSchema),
    resetForm: true
  });
  const { form: formData, enhance, message } = form;
</script>

<IllustrationTown />

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
        {#snippet content({ props })}
          <Input {...props} type="email" bind:value={$formData.email} data-testid="email" />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    <Spacer />
    <Field {form} name="password">
      <FSControl label="Password">
        {#snippet content({ props })}
          <Input type="password" {...props} bind:value={$formData.password} data-testid="password" />
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

<style>
  :global(.panel.login) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
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
