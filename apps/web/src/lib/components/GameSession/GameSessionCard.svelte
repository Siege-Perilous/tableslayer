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
    ConfirmActionButton,
    addToast
  } from '@tableslayer/ui';
  import { useDeleteGameSessionMutation, useUpdateGameSessionMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import type { SelectGameSession, SelectParty, SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconChevronDown, IconCheck, IconDownload } from '@tabler/icons-svelte';
  import { invalidateAll } from '$app/navigation';
  import { exportGameSession } from '$lib/utils';

  let {
    party,
    session,
    isPartyAdmin
  }: {
    party: SelectParty & Thumb;
    session: SelectGameSession & { scenes: Partial<SelectScene & Thumb>[] };
    isPartyAdmin: boolean;
  } = $props();

  let gameSessionName = $state(session.name);
  let renameGameSessionErrors = $state<FormMutationError | undefined>(undefined);
  let formIsLoading = $state(false);
  let exportIsLoading = $state(false);

  const images: string[] = [];

  for (const scene of session.scenes) {
    if (scene.thumb) {
      const thumb = scene.thumb.resizedUrl;
      images.push(thumb);
    }
  }

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
        invalidateAll();
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
      onSuccess: () => {
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Game session deleted' },
        error: { title: 'Error deleting game session', body: (error) => error.message }
      }
    });
  };

  const handleExportGameSession = async () => {
    try {
      exportIsLoading = true;
      await exportGameSession(session.id);
      addToast({
        data: {
          title: 'Game session exported',
          body: `${session.name} has been exported successfully`,
          type: 'success'
        }
      });
    } catch (error) {
      addToast({
        data: {
          title: 'Error exporting game session',
          body: error instanceof Error ? error.message : 'An unknown error occurred',
          type: 'danger'
        }
      });
    } finally {
      exportIsLoading = false;
    }
  };
</script>

<LinkBox>
  <Panel class="gameSessionCard">
    <div
      class="cardFan__image"
      style={`
      background-image: linear-gradient(rgba(0, 0, 0, 0), var(--contrastLowest) 50%), url(${images[0]});`}
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
              <Button
                type="button"
                class="gameSessionCard__exportBtn"
                onclick={handleExportGameSession}
                on:click={handleExportGameSession}
                disabled={exportIsLoading}
                isLoading={exportIsLoading}
              >
                <Icon Icon={IconDownload} />
                Export session
              </Button>
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
                    isLoading={formIsLoading}
                  >
                    Delete session
                  </Button>
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
          <Link as="span" class="gameSessionCard__aboveImage">
            {session.name}
          </Link>
        </LinkOverlay>
      </Title>
      {#if session.lastUpdated}
        <Text>Last edited: {session.lastUpdated.toLocaleDateString()}</Text>
      {:else}
        <Text>New game session</Text>
      {/if}
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
    .gameSessionCard__aboveImage {
      position: relative;
    }
  }
  .cardFan__image {
    background-size: 100%;
    background-position: top;
    filter: grayscale(0.5);
    opacity: 0.5;
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

  :global(.gameSessionCard__exportBtn) {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
</style>
