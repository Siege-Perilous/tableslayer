<script lang="ts">
  import { Panel, Title, Text, Spacer } from '@tableslayer/ui';
  import {
    PartyMember,
    ResendInvite,
    PartyTitle,
    CreateGameSession,
    GameSessionCard,
    DefaultPartySettings,
    InvitePartyMember,
    PartyUpgrade
  } from '$lib/components';

  let { data } = $props();
  const { party, gameSessions, members, isPartyAdmin, invitedEmails, user } = $derived(data);

  const partyId = data.party.id as string;
  const needsToUpgrade = $derived(party.plan === 'free' && gameSessions.length >= 2);
</script>

<div class="container">
  <PartyTitle {isPartyAdmin} {party} {user} />
  <div class="containerLayout">
    <main>
      <Title as="h2" size="sm">Sessions</Title>
      <Spacer />
      <div class="sessionList">
        {#if isPartyAdmin}
          {#if needsToUpgrade}
            <Panel class="panelUpgrade">
              <Title as="p" size="sm">Session limit hit</Title>
              <Text size="0.875rem" color="var(--fgMuted)">Free plan limited to 2 game sessions</Text>
            </Panel>
          {:else}
            <CreateGameSession {partyId} />
          {/if}
        {/if}
        {#each gameSessions as session (session.id)}
          <GameSessionCard {isPartyAdmin} {party} {session} />
        {/each}
      </div>
    </main>
    <aside>
      {#if isPartyAdmin}
        <Title as="h2" size="sm">Patronage</Title>
        <Spacer />
        <PartyUpgrade {party} />
        <Spacer />
      {/if}
      <Title as="h2" size="sm">Party members</Title>
      <Spacer />
      <Panel class="partyMembers__aside">
        <div class="partyMembers">
          {#each members as member (member.id)}
            <PartyMember {user} {member} {isPartyAdmin} />
          {:else}
            <p>No members found.</p>
          {/each}
        </div>
        <InvitePartyMember {isPartyAdmin} {party} />
        {#if invitedEmails.length > 0}
          <Spacer size={4} />
          <Text weight={600}>Pending invites</Text>
          <Spacer size={2} />
          <div class="partyMembers">
            {#each invitedEmails as email (email)}
              <ResendInvite {email} {partyId} {isPartyAdmin} />
            {:else}
              <Text>No pending invites</Text>
            {/each}
          </div>
        {/if}
      </Panel>
      <DefaultPartySettings {party} />
    </aside>
  </div>
</div>

<style>
  :global {
    .partyMembers__aside {
      padding: 1rem;
    }
    .panel.panelUpgrade {
      padding: var(--size-4);
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 1rem;
      height: 100%;
      min-height: 270px;
      transition: border-color 0.2s var(--ease-in-2);
      align-items: center;
      justify-content: center;
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

  @media (max-width: 768px) {
    .container {
      padding: 0 2rem;
    }
    .containerLayout {
      grid-template-columns: 1fr;
    }
  }
</style>
