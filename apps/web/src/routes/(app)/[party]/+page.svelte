<script lang="ts">
  import {
    Icon,
    IconButton,
    FSControl,
    Input,
    FieldErrors,
    Panel,
    Title,
    Text,
    MessageError,
    Spacer,
    Hr
  } from '@tableslayer/ui';
  import { PartyMember, ResendInvite, PartyTitle, CreateGameSession, GameSessionCard } from '$lib/components';
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { inviteMemberSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { IconMail } from '@tabler/icons-svelte';

  let { data } = $props();
  const { party, gameSessions, members, isPartyAdmin, invitedEmails, user } = $derived(data);
  const inviteMemberForm = superForm(data.inviteMemberForm, {
    validators: zodClient(inviteMemberSchema)
  });

  const { form: inviteMemberData, enhance: enhanceInviteMember, message: inviteMemberMessage } = inviteMemberForm;

  const partyId = data.party.id as string;
</script>

<div class="container">
  <PartyTitle {isPartyAdmin} deletePartyForm={data.deletePartyForm} renamePartyForm={data.renamePartyForm} {party} />
  <div class="containerLayout">
    <main>
      <Title as="h2" size="sm">Sessions</Title>
      <Spacer />
      <div class="sessionList">
        <CreateGameSession {partyId} createGameSessionForm={data.creatGameSessionForm} />
        {#each gameSessions as session}
          <GameSessionCard
            {party}
            {session}
            deleteGameSessionForm={data.deleteGameSessionForm}
            renameGameSessionForm={data.renameGameSessionForm}
          />
        {/each}
      </div>
    </main>
    <aside>
      <Title as="h2" size="sm">Party members</Title>
      <Spacer />
      <Panel class="partyMembers__aside">
        <div class="partyMembers">
          {#each members as member}
            <PartyMember
              {user}
              {member}
              {isPartyAdmin}
              removePartyMemberForm={data.removePartyMemberForm}
              changeMemberRoleForm={data.changeMemberRoleForm}
            />
          {:else}
            <p>No members found.</p>
          {/each}
        </div>
        {#if isPartyAdmin}
          <Spacer size={4} />
          <Hr />
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
        {#if invitedEmails.length > 0}
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
        {/if}
      </Panel>
    </aside>
  </div>
</div>

<style>
  :global {
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
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
