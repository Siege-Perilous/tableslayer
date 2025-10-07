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
    PartyUpgrade,
    Head
  } from '$lib/components';

  let { data } = $props();
  const { party, gameSessions, isPartyAdmin, invitedEmails, user, stripeEnabled } = $derived(data);
  // Map partyRole to role for the PartyMember component
  const members = $derived(
    data.members.map((m) => {
      const { partyRole, role: userRole, ...rest } = m;
      return { ...rest, role: partyRole, userRole };
    })
  );

  const partyId = $derived(party.id as string);
  const needsToUpgrade = $derived(stripeEnabled && party.plan === 'free' && gameSessions.length >= 2);
</script>

<Head title={party.name} description={`${party.name} on Table Slayer`} />

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
      {#if isPartyAdmin && stripeEnabled}
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
          <Spacer size="1rem" />
          <Text weight={600}>Pending invites</Text>
          <Spacer size="0.5rem" />
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
    min-height: 400px; /* Prevent vertical shift */
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
