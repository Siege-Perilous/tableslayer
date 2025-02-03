<script lang="ts">
  import { Panel, Title, Text, Spacer } from '@tableslayer/ui';
  import {
    PartyMember,
    ResendInvite,
    PartyTitle,
    CreateGameSession,
    GameSessionCard,
    DefaultPartySettings,
    InvitePartyMember
  } from '$lib/components';

  let { data } = $props();
  const { party, gameSessions, members, isPartyAdmin, invitedEmails, user } = $derived(data);

  const partyId = data.party.id as string;
</script>

<div class="container">
  <PartyTitle {isPartyAdmin} {party} />
  <div class="containerLayout">
    <main>
      <Title as="h2" size="sm">Sessions</Title>
      <Spacer />
      <div class="sessionList">
        {#if isPartyAdmin}
          <CreateGameSession {partyId} />
        {/if}
        {#each gameSessions as session}
          <GameSessionCard {isPartyAdmin} {party} {session} />
        {/each}
      </div>
    </main>
    <aside>
      <Title as="h2" size="sm">Party members</Title>
      <Spacer />
      <Panel class="partyMembers__aside">
        <div class="partyMembers">
          {#each members as member}
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
</style>
