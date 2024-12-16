<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import SuperDebug, { fileProxy } from 'sveltekit-superforms';
  import { createPartySchema } from '$lib/schemas';
  import {
    Input,
    FileInput,
    MessageError,
    Button,
    FSControl,
    FieldErrors,
    Title,
    Spacer,
    Panel
  } from '@tableslayer/ui';

  let { data } = $props();
  const form = superForm(data.createPartyForm, {
    validators: zodClient(createPartySchema),
    invalidateAll: 'force'
  });
  const { form: formData, enhance, message } = form;
  let file = $state(fileProxy(formData, 'file'));
</script>

<Panel class="createPartyPanel">
  <Title as="h1" size="md" data-testid="createParty">Create a new party</Title>
  <Spacer size={8} />
  <form method="POST" enctype="multipart/form-data" action="?/createParty" use:enhance>
    <Field {form} name="name">
      <FSControl label="Party name">
        {#snippet content({ props })}
          <Input {...props} type="text" bind:value={$formData.name} hideAutocomplete />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    <Spacer />
    <Field {form} name="file">
      <FSControl label="Party avatar">
        {#snippet content({ props })}
          <FileInput {...props} type="file" accept="image/png, image/jpeg" bind:files={$file} />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    {#if $message}
      <Spacer />
      <MessageError message={$message} />
    {/if}
    <Spacer />
    <Button data-testid="createPartySubmit">Create party</Button>
  </form>
  <Spacer />
</Panel>
<SuperDebug data={$formData} display={false} />

<style>
  :global(.panel.createPartyPanel) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
