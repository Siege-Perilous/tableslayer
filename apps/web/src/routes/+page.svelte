<script lang="ts">
  import { dev } from '$app/environment';
  import { Title, Text, Spacer, Button, Panel, Hr } from '@tableslayer/ui';
  let { data } = $props();
  const { user } = data;
  import { IllustrationOverlook } from '$lib/components';
  import { notifySchema } from '$lib/schemas';
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { MessageError, FieldErrors, Input, FSControl } from '@tableslayer/ui';

  const notifySuperForm = superForm(data.notifyForm, {
    validators: zodClient(notifySchema),
    resetForm: true
  });

  const { form: notifyForm, enhance: notifyEnhance, message: notifyMessage } = notifySuperForm;
</script>

<IllustrationOverlook />

<Panel class="panel--signup">
  <Title as="h1" size="lg" class="heroTitle">Table Slayer</Title>
  <Spacer size={8} />
  <Text size="1.5rem">Tools to create animated battle maps for in person RPG games.</Text>
  <Spacer />
  <Hr />
  <Spacer size={8} />
  {#if user}
    <div>
      <Button href="/profile" class="btn">Dashboard</Button>
    </div>
  {:else if dev}
    <div class="flex">
      <Button href="/login" class="btn">Log in</Button>
      <Button href="/signup" class="btn">Sign up</Button>
    </div>
  {:else if !$notifyMessage || ($notifyMessage && $notifyMessage.type !== 'success')}
    <Text color="var(--fgMuted)">Interested in joining the beta? Sign up for updates.</Text>
    <Spacer size={4} />
    <form method="POST" action="?/notify" use:notifyEnhance>
      <Field form={notifySuperForm} name="email">
        <FSControl label="Email">
          {#snippet content({ props })}
            <Input {...props} type="email" bind:value={$notifyForm.email} data-testid="email" />
          {/snippet}
        </FSControl>
        <FieldErrors />
      </Field>
      <Spacer />
      <Button data-testid="notifySubmit">Add me to the beta</Button>
    </form>
  {:else}
    <Text size="1.5rem">Thanks. We'll contact you soon.</Text>
  {/if}
  {#if $notifyMessage}
    <MessageError message={$notifyMessage} />
  {/if}
</Panel>

<style>
  :global(.title.heroTitle) {
    font-size: 4rem;
    line-height: 1.2;
    font-weight: 900;
    width: fit-content;
    /*  color: transparent;  */
    /*  background-clip: text;  */
    /*  background-image: linear-gradient(0deg, rgba(122, 5, 5, 1) 0%, rgba(223, 5, 5, 1) 35%, rgba(255, 0, 50, 1) 100%);  */
    /*  text-shadow:  */
    /*  2px 2px 0 rgba(255, 255, 255, 0.2),  */
    /*  -1px 0 0 rgba(255, 255, 255, 1);  */
  }
  :global(.panel.panel--signup) {
    display: flex;
    flex-direction: column;
    width: fit-content;
    max-width: 450px;
    padding: var(--size-12);
    margin: 20vh auto auto 10vh;
    position: relative;
    z-index: 5;
  }
  .flex {
    display: flex;
    gap: var(--size-4);
  }
  :global(.heroTitle) {
    letter-spacing: 0.2rem;
  }

  @media (max-width: 768px) {
    :global(.panel.panel--signup) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
