<script lang="ts">
  import {
    Button,
    Icon,
    IconButton,
    FSControl,
    Input,
    FieldErrors,
    Link,
    Panel,
    Title,
    Text,
    MessageError,
    Spacer,
    Hr
  } from '@tableslayer/ui';
  import { PartyMember, ResendInvite } from '$lib/components';
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { inviteMemberSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { IconMail } from '@tabler/icons-svelte';

  let { data } = $props();
  const { party, gameSessions, members, isPartyAdmin, invitedEmails } = $derived(data);
  const inviteMemberForm = superForm(data.inviteMemberForm, {
    validators: zodClient(inviteMemberSchema)
  });

  const { form: inviteMemberData, enhance: enhanceInviteMember, message: inviteMemberMessage } = inviteMemberForm;

  const partyId = data.party.id as string;
</script>

<div class="container">
  <Title as="h1" size="lg">{party.name}</Title>
  <div class="containerLayout">
    <main>
      <Title as="h2" size="sm">Sessions</Title>
      <div class="sessionList">
        {#each gameSessions as session}
          <Panel class="sessionPanel">
            <Link href={`${party.slug}/${session.slug}`}>{session.name}</Link>
            <Button>Delete</Button>
          </Panel>
        {/each}
      </div>
    </main>
    <aside>
      <Panel class="partyMembers__aside">
        <Title as="h2" size="sm">Party members</Title>
        <Spacer />
        <div class="partyMembers">
          {#each members as member}
            <PartyMember {member} {isPartyAdmin} changeMemberRoleForm={data.changeMemberRoleForm} />
          {:else}
            <p>No members found.</p>
          {/each}
        </div>
        <Spacer size={4} />

        <Hr />

        {#if isPartyAdmin}
          <Spacer size={4} />
          <form method="post" action="?/inviteMember" use:enhanceInviteMember>
            <div class="partyMember__inviteForm">
              <div>
                <Field form={inviteMemberForm} name="email">
                  <FSControl label="Invite new member">
                    {#snippet children({ attrs })}
                      <Input {...attrs} type="email" placeholder="email address" bind:value={$inviteMemberData.email} />
                    {/snippet}
                  </FSControl>
                  <FieldErrors />
                </Field>
              </div>

              <IconButton type="submit" class="partyMember__inviteFormBtn">
                <Icon Icon={IconMail} />
              </IconButton>
            </div>
            {#if $inviteMemberMessage}
              <MessageError message={$inviteMemberMessage} />
            {/if}
            <Field form={inviteMemberForm} name="email">
              <FSControl>
                {#snippet children({ attrs })}
                  <Input {...attrs} type="hidden" name="partyId" bind:value={$inviteMemberData.partyId} />
                {/snippet}
              </FSControl>
            </Field>
          </form>
        {/if}
        <Spacer size={4} />
        <Text weight={600}>Pending invites</Text>
        <Spacer size={2} />
        <div class="partyMembers">
          {#each invitedEmails as email (email)}
            <ResendInvite
              removeInviteForm={data.removeInviteForm}
              resendInviteForm={data.resendInviteForm}
              {email}
              {partyId}
              {isPartyAdmin}
            />
          {:else}
            <Text>No pending invites</Text>
          {/each}
        </div>
      </Panel>
    </aside>
  </div>
</div>

<style>
  :global {
    .sessionPanel {
      padding: var(--size-4);
    }
    .partyMember__inviteFormBtn {
      margin-top: 1.5rem;
    }
    .partyMembers__aside {
      padding: 1rem;
    }
  }
  .container {
    max-width: var(--contain-desktop);
    margin: var(--size-12) auto;
  }
  .containerLayout {
    display: grid;
    grid-template-columns: 3fr 1fr;
    margin-top: var(--size-8);
    gap: var(--size-12);
  }
  .sessionList {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--size-4);
  }
  .partyMembers {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .partyMember__inviteForm {
    display: flex;
    gap: 0.5rem;
  }
</style>
