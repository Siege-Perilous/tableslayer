<script lang="ts">
  import {
    FSControl,
    Spacer,
    Button,
    Hr,
    MessageError,
    Input,
    LinkBox,
    Panel,
    CardFan,
    Title,
    Text,
    Link,
    LinkOverlay,
    Popover,
    IconButton,
    Icon
  } from '@tableslayer/ui';
  import { superForm, type SuperValidated } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import {
    deleteGameSessionSchema,
    renameGameSessionSchema,
    type DeleteGameSessionFormType,
    type RenameGameSessionFormType
  } from '$lib/schemas';
  import type { SelectGameSession, SelectParty } from '$lib/db';
  import type { AvatarThumb } from '$lib/server';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { IconChevronDown, IconCheck } from '@tabler/icons-svelte';
  import SuperDebug from 'sveltekit-superforms';

  let {
    party,
    session,
    deleteGameSessionForm,
    renameGameSessionForm,
    isPartyAdmin
  }: {
    party: SelectParty & AvatarThumb;
    session: SelectGameSession;
    deleteGameSessionForm: SuperValidated<DeleteGameSessionFormType>;
    renameGameSessionForm: SuperValidated<RenameGameSessionFormType>;
    isPartyAdmin: boolean;
  } = $props();

  const deleteGameSessionSuperForm = superForm(deleteGameSessionForm, {
    id: `deleteGameSession-${session.id}`,
    validators: zodClient(deleteGameSessionSchema),
    invalidateAll: 'force'
  });

  const {
    form: deleteGameSessionFormData,
    enhance: deleteGameSessionEnhance,
    message: deleteGameSessionMessage
  } = deleteGameSessionSuperForm;

  $deleteGameSessionFormData.sessionId = session.id;
  $deleteGameSessionFormData.partyId = party.id;

  const renameGameSessionSuperForm = superForm(renameGameSessionForm, {
    id: `renameGameSession-${session.id}`,
    validators: zodClient(renameGameSessionSchema),
    invalidateAll: 'force'
  });

  const {
    form: renameGameSessionFormData,
    enhance: renameGameSessionEnhance,
    message: renameGameSessionMessage
  } = renameGameSessionSuperForm;

  $renameGameSessionFormData.sessionId = session.id;
  $renameGameSessionFormData.partyId = party.id;
  $renameGameSessionFormData.name = session.name;

  const images = [
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/01.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/02.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/03.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/04.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/12.jpeg'
  ];
</script>

<LinkBox>
  <Panel class="gameSessionCard">
    <div
      class="cardFan__image"
      style="
      background-image: linear-gradient(rgba(0, 0, 0, 0), var(--contrastLowest) 50%), url('https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,w=400/maps/01.jpeg');"
    ></div>
    {#if isPartyAdmin}
      <div class="gameSessionCard__popover">
        <Popover positioning={{ placement: 'bottom-end' }}>
          {#snippet trigger()}
            <Icon Icon={IconChevronDown} />
          {/snippet}
          {#snippet content()}
            <div class="gameSessionCard__popoverContent">
              <form method="post" action="?/renameGameSession" use:renameGameSessionEnhance>
                <div class="gameSessionCard__renameField">
                  <div>
                    <Field form={renameGameSessionSuperForm} name="name">
                      <FSControl label="Rename session">
                        {#snippet children({ attrs })}
                          <Input {...attrs} bind:value={$renameGameSessionFormData.name} autocomplete="off" />
                        {/snippet}
                      </FSControl>
                    </Field>
                    <input type="hidden" name="sessionId" value={$renameGameSessionFormData.sessionId} />
                    <input type="hidden" name="partyId" value={$renameGameSessionFormData.sessionId} />
                  </div>
                  <IconButton type="submit" class="gameSessionCard__renameFieldBtn">
                    <Icon Icon={IconCheck} />
                  </IconButton>
                </div>
                <Spacer size={2} />
                <Text size="0.875rem" color="var(--fgMuted)"
                  >Renaming your game session will change the URL and break all links.</Text
                >
              </form>
              {#if $renameGameSessionMessage}
                <Spacer />
                <MessageError message={$renameGameSessionMessage} />
              {/if}
              <SuperDebug data={$renameGameSessionFormData} display={false} />
              <Spacer />
              <Hr />
              <Spacer />
              <form method="post" action="?/deleteGameSession" use:deleteGameSessionEnhance>
                <Field form={deleteGameSessionSuperForm} name="sessionId">
                  <FSControl>
                    {#snippet children({ attrs })}
                      <input {...attrs} type="hidden" name="sessionId" value={$renameGameSessionFormData.sessionId} />
                    {/snippet}
                  </FSControl>
                </Field>
                <Field form={deleteGameSessionSuperForm} name="partyId">
                  <FSControl>
                    {#snippet children({ attrs })}
                      <input {...attrs} type="hidden" name="partyId" value={$renameGameSessionFormData.partyId} />
                    {/snippet}
                  </FSControl>
                </Field>
                {#if $deleteGameSessionMessage}
                  <Spacer />
                  <MessageError message={$deleteGameSessionMessage} />
                {/if}
                <Button type="submit" variant="danger">Delete party</Button>
              </form>
            </div>
          {/snippet}
        </Popover>
      </div>
    {/if}
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

<style>
  :global {
    .panel.gameSessionCard {
      padding: var(--size-4);
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 2rem;
      height: 100%;
      transition: border-color 0.2s var(--ease-in-2);
    }
    .panel.gameSessionCard:hover {
      border-color: var(--fgPrimary);
    }
    .panel.gameSessionCard:hover .cardFan__image {
      background-size: 105%;
    }
    .cardFan--sessionList {
      margin: 0 auto;
    }
    .gameSessionCard__renameFieldBtn {
      margin-top: 1.5rem;
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
  .gameSessionCard__popover {
    position: absolute;
    z-index: 1;
    top: 1.5rem;
    right: 1.5rem;
  }
  .gameSessionCard__renameField {
    display: flex;
    gap: 0.5rem;
  }
  .gameSessionCard__popoverContent {
    width: 16rem;
  }
</style>
