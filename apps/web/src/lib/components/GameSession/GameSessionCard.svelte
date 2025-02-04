<script lang="ts">
  import {
    Spacer,
    Button,
    Hr,
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
    Icon,
    FormControl,
    ConfirmActionButton
  } from '@tableslayer/ui';
  import { useDeleteGameSessionMutation, useUpdateGameSessionMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconChevronDown, IconCheck } from '@tabler/icons-svelte';

  let {
    party,
    session,
    isPartyAdmin
  }: {
    party: SelectParty & Thumb;
    session: SelectGameSession;
    isPartyAdmin: boolean;
  } = $props();

  let gameSessionName = $state(session.name);
  let renameGameSessionErrors = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);

  const images = [
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/01.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/02.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/03.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/04.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/12.jpeg'
  ];

  const renameGameSession = useUpdateGameSessionMutation();

  const handleRenameGameSession = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () =>
        $renameGameSession.mutateAsync({
          partyId: party.id,
          gameSessionId: session.id,
          gameSessionData: { name: gameSessionName }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        renameGameSessionErrors = error;
      },
      onSuccess: () => {
        renameGameSessionErrors = undefined;
      },
      toastMessages: {
        success: { title: `Game session renamed to ${gameSessionName}` },
        error: { title: 'Error renaming game session', body: (error) => error.message }
      }
    });
  };

  const deleteGameSession = useDeleteGameSessionMutation();

  const handleDeleteGameSession = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () =>
        $deleteGameSession.mutateAsync({
          partyId: party.id,
          gameSessionId: session.id
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      toastMessages: {
        success: { title: 'Game session deleted' },
        error: { title: 'Error deleting game session', body: (error) => error.message }
      }
    });
  };
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
        <Popover>
          {#snippet trigger()}
            <IconButton as="div" variant="ghost">
              <Icon Icon={IconChevronDown} />
            </IconButton>
          {/snippet}
          {#snippet content()}
            <div class="gameSessionCard__popoverContent">
              <form onsubmit={handleRenameGameSession}>
                <div class="gameSessionCard__renameField">
                  <div>
                    <FormControl
                      label="Rename session"
                      name="name"
                      errors={renameGameSessionErrors && renameGameSessionErrors.errors}
                    >
                      {#snippet input({ inputProps })}
                        <Input {...inputProps} bind:value={gameSessionName} hideAutocomplete />
                      {/snippet}
                    </FormControl>
                  </div>
                  <IconButton class="gameSessionCard__renameFieldBtn">
                    <Icon Icon={IconCheck} />
                  </IconButton>
                </div>
                <Spacer size={2} />
                <Text size="0.875rem" color="var(--fgMuted)">
                  Renaming your game session will change the URL and break all links.
                </Text>
              </form>
              <Spacer />
              <Hr />
              <Spacer />
              <ConfirmActionButton actionButtonText="Confirm delete" action={handleDeleteGameSession}>
                {#snippet trigger({ triggerProps })}
                  <Button
                    {...triggerProps}
                    variant="danger"
                    type="button"
                    disabled={formIsLoading}
                    isLoading={formIsLoading}>Delete session</Button
                  >
                {/snippet}
                {#snippet actionMessage()}
                  <Text size="0.875rem" color="var(--fgDanger)">
                    You will lose all data associated with this game session. This can not be undone
                  </Text>
                {/snippet}
              </ConfirmActionButton>
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
