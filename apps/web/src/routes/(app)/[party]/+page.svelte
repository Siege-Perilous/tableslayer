<script lang="ts">
  import {
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
    CardFan,
    LinkBox,
    LinkOverlay,
    Hr
  } from '@tableslayer/ui';
  import { PartyMember, ResendInvite } from '$lib/components';
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

  const images = [
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/01.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/02.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/03.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/04.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/12.jpeg'
  ];
</script>

<div class="container">
  <Title as="h1" size="lg">{party.name}</Title>
  <div class="containerLayout">
    <main>
      <Title as="h2" size="sm">Sessions</Title>
      <Spacer />
      <div class="sessionList">
        <LinkBox>
          <Panel class="sessionPanel sessionPanel--create">
            <Title as="p" size="sm">Create new session</Title>
          </Panel>
        </LinkBox>
        {#each gameSessions as session}
          <LinkBox>
            <Panel class="sessionPanel">
              <div
                class="cardFan__image"
                style="
                background-image: linear-gradient(rgba(0, 0, 0, 0), var(--contrastLowest) 50%), url('https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,w=400/maps/01.jpeg');"
              ></div>
              <CardFan {images} class="cardFan--sessionList" />
              <div>
                <Title as="h3" size="sm">
                  <LinkOverlay href={`${party.slug}/${session.slug}`}>
                    <Link as="span">
                      {session.name}
                    </Link>
                  </LinkOverlay>
                </Title>
                <Text>Last edited: {new Date().toLocaleDateString()}</Text>
              </div>
            </Panel>
          </LinkBox>
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
    .panel.sessionPanel {
      padding: var(--size-4);
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 2rem;
      height: 100%;
    }
    .panel.sessionPanel:hover {
      border-color: var(--fgPrimary);
    }
    .panel.sessionPanel:hover .cardFan__image {
      background-size: 105%;
    }
    .panel.sessionPanel--create {
      align-items: center;
      justify-content: center;
    }
    .partyMember__inviteFormBtn {
      margin-top: 1.5rem;
    }
    .partyMembers__aside {
      padding: 1rem;
    }
    .cardFan--sessionList {
      margin: 0 auto;
    }
  }
  .cardFan__image {
    background-size: 100%;
    background-position: center;
    filter: grayscale(0.5);
    opacity: 0.3;
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    width: calc(100% - 1rem);
    border-radius: 0.25rem;
    height: calc(100% - 1rem);
    transition: background-size 0.2s var(--ease-in-2);
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
