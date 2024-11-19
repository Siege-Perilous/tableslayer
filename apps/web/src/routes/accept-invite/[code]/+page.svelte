<script lang="ts">
  let { data } = $props();
  const { invite, user } = data;
  import { PartyInviteResponse } from '$lib/components';
  import { Avatar, Button, Panel, Spacer, Title } from '@tableslayer/ui';
  console.log('invite in client', invite);
  import { page } from '$app/stores';
</script>

<Panel class="panelInvite">
  {#if !invite}
    <Title as="h1" size="lg">Invalid invite code</Title>
    <Spacer size={4} />
    <p>The code {$page.params.code} does not exist or has already been accepted.</p>
  {:else if user && invite}
    <Title as="h1" size="md">Hero, aceept the call!</Title>
    <Spacer size={4} />
    <p class="name">
      <strong>{invite.invite.email}</strong>,
    </p>
    <Spacer size={4} />
    <p>Your presense was requested by</p>
    <Spacer size={2} />
    <div class="invitedBy">
      <Avatar src={invite.invitedByUser.avatarThumb.resizedUrl || invite.invitedByUser.avatarThumb.url} />
      {invite.invitedByUser.name} - {invite.invitedByUser.email}
    </div>
    <Spacer size={6} />
    <p>They ask you to join</p>
    <Spacer size={2} />
    <p>
      <span class="partyName">{invite?.party?.name}</span>
    </p>

    <Spacer size={8} />
    <PartyInviteResponse {invite} willRedirectToParty />
  {:else}
    <Title as="h1" size="lg">You aren't logged in</Title>
    <Spacer size={4} />
    <p>You need an account for {invite.email} to accept this invite</p>
    <Spacer size={4} />
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
