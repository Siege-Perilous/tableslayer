<script lang="ts">
  let { data } = $props();
  const { invite, user } = data;
  import { PartyInviteResponse, Head } from '$lib/components';
  import { Avatar, Button, Panel, Spacer, Title } from '@tableslayer/ui';
  import { page } from '$app/state';
</script>

<Head title="Accept Invite" description="Accept Invite to Table Slayer" />

<Panel class="panelInvite">
  {#if !invite}
    <Title as="h1" size="lg">Invalid invite code</Title>
    <Spacer size="1rem" />
    <p>The code {page.params.code} does not exist or has already been accepted.</p>
  {:else if user && invite}
    <Title as="h1" size="md">Hero, aceept the call!</Title>
    <Spacer size="1rem" />
    <p class="name">
      <strong>{invite.invite.email}</strong>
      ,
    </p>
    <Spacer size="1rem" />
    <p>Your presense was requested by</p>
    <Spacer size="0.5rem" />
    <div class="invitedBy">
      <Avatar src={invite.invitedByUser.thumb.resizedUrl || invite.invitedByUser.thumb.url} />
      {invite.invitedByUser.name} - {invite.invitedByUser.email}
    </div>
    <Spacer size="1.5rem" />
    <p>They ask you to join</p>
    <Spacer size="0.5rem" />
    <p>
      <span class="partyName">{invite?.party?.name}</span>
    </p>

    <Spacer size="2rem" />
    <PartyInviteResponse {invite} />
  {:else}
    <Title as="h1" size="lg">You aren't logged in</Title>
    <Spacer size="1rem" />
    <p>You need an account for {invite.invite.email} to accept this invite</p>
    <Spacer size="1rem" />
    <div class="invitedBy">
      <Button href="/signup">Sign up</Button>
      <Button href="/login">Log in</Button>
    </div>
  {/if}
</Panel>

<style>
  :global(.panel.panelInvite) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-mobile);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
  .name {
    color: var(--fgMuted);
    font-size: var(--font-size-4);
  }
  .partyName {
    font-weight: var(--font-weight-8);
    font-style: italic;
  }
  .invitedBy {
    display: flex;
    gap: var(--size-2);
    align-items: center;
  }
</style>
