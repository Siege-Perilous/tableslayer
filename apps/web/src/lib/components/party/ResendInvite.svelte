<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { Field } from 'formsnap';
  import { FSControl, Hr, Text, Avatar, MessageError, Icon, Popover, Spacer, Button } from '@tableslayer/ui';
  import { resendInviteSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { type SuperValidated } from 'sveltekit-superforms/client';
  import { type ResendInviteFormType } from '$lib/schemas';
  import { IconChevronDown } from '@tabler/icons-svelte';

  let {
    email,
    partyId,
    resendInviteForm,
    isPartyAdmin
  }: {
    email: string;
    partyId: string;
    resendInviteForm: SuperValidated<ResendInviteFormType>;
    isPartyAdmin: boolean;
  } = $props();
  const form = superForm(resendInviteForm, { id: email, validators: zodClient(resendInviteSchema) });
  const { form: resendForm, enhance, message } = form;
  $resendForm.email = email;
  $resendForm.partyId = partyId;
</script>

{#snippet resendInvite()}
  <div class="resendInvite">
    <div class="resendInvite__avatar">
      <Avatar initials="TS" />
      {#if isPartyAdmin}
        <Icon Icon={IconChevronDown} color="var(--fgMuted)" class="resendInvite__chevron" />
      {/if}
    </div>
    <p>{email}</p>
  </div>
{/snippet}

{#if isPartyAdmin}
  <Popover positioning={{ placement: 'bottom-start' }}>
    {#snippet trigger()}
      {@render resendInvite()}
    {/snippet}
    {#snippet content()}
      <div class="resendInvite__popover">
        <form method="post" action="?/resendInvite" use:enhance>
          <Button type="submit">Resend invite</Button>
          <Spacer size={2} />
          <Field {form} name="email">
            <FSControl>
              <input type="hidden" name="email" bind:value={$resendForm.email} />
              <input type="hidden" name="partyId" bind:value={$resendForm.partyId} />
            </FSControl>
          </Field>
          <Text size="0.875rem" color="var(--fgMuted)"
            >The previous email will be invalidated and a new one will be sent.</Text
          >
          {#if $message}
            <MessageError message={$message} />
          {/if}
        </form>
        <Spacer size={4} />
        <Hr />
        <Spacer size={4} />
        <Button variant="danger">Cancel invite</Button>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)">Any previous email invites sent will no longer work</Text>
      </div>
    {/snippet}
  </Popover>
{:else}
  {@render resendInvite()}
{/if}

<style>
  .resendInvite {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }
  .resendInvite:hover {
    text-decoration: underline;
  }
  .resendInvite__avatar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.resendInvite__chevron) {
    justify-self: end;
  }
  .resendInvite__popover {
    width: 16rem;
  }
</style>
