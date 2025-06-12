<script lang="ts">
  import { Spacer, Button, Text, Hr } from '@tableslayer/ui';
  import type { SelectGameSession, SelectParty, SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { useUpdateGameSessionMutation } from '$lib/queries';
  import { useUpdatePartyMutation } from '$lib/queries/parties';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  let {
    socketUpdate,
    party,
    gameSession,
    selectedScene,
    activeScene
  }: {
    socketUpdate: () => void;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeScene: SelectScene | (SelectScene & Thumb) | null;
  } = $props();

  const updateGameSession = useUpdateGameSessionMutation();
  const updateParty = useUpdatePartyMutation();
  const handleSetActiveScene = async () => {
    if (!selectedScene || (activeScene && selectedScene.id === activeScene.id)) return;

    await handleMutation({
      mutation: () =>
        $updateGameSession.mutateAsync({
          gameSessionId: gameSession.id,
          gameSessionData: { activeSceneId: selectedScene.id },
          partyId: party.id
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        invalidateAll();
        socketUpdate();
      },
      toastMessages: {
        success: { title: 'Active scene set' },
        error: {
          title: 'Error setting active scene',
          body: (err: FormMutationError) => err.message || 'Error setting active scene'
        }
      }
    });
  };

  const handleToggleGamePause = async () => {
    if (!selectedScene) return;

    await handleMutation({
      mutation: () =>
        $updateGameSession.mutateAsync({
          gameSessionId: gameSession.id,
          gameSessionData: { isPaused: !gameSession.isPaused },
          partyId: party.id
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        invalidateAll();
        socketUpdate();
      },
      toastMessages: {
        success: { title: 'Playfield paused' },
        error: {
          title: 'Error pausing playfield',
          body: (err: FormMutationError) => err.message || 'Error pausing playfield'
        }
      }
    });
  };

  const handleSetActiveGameSession = async () => {
    if (gameSession.id === party.activeGameSessionId) return;

    await handleMutation({
      mutation: () =>
        $updateParty.mutateAsync({
          partyId: party.id,
          partyData: { activeGameSessionId: gameSession.id }
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        invalidateAll();
        socketUpdate();
      },
      toastMessages: {
        success: { title: 'Active session set' },
        error: {
          title: 'Error setting active session',
          body: (err: FormMutationError) => err.message || 'Error setting active session'
        }
      }
    });
  };
</script>

<div class="playControls">
  <Button href={`/${party.slug}/play`} target="_blank">Open playfield</Button>
  <Spacer size="0.5rem" />
  <Text size="0.85rem" color="var(--fgMuted)">
    This will open a new tab with the playfield. Fullscreen it on your display.
  </Text>
  <Spacer />
  <Hr />
  <Spacer />
  {#if gameSession.id !== party.activeGameSessionId}
    <Button onclick={handleSetActiveGameSession}>Set as active session</Button>
    <Spacer size="0.5rem" />
    <Text size="0.85rem" color="var(--fgMuted)">Makes this session active on the playfield.</Text>
    <Spacer />
    <Hr />
    <Spacer />
  {/if}
  {#if !activeScene || selectedScene.id !== activeScene.id}
    <Button onclick={handleSetActiveScene}>Set active scene</Button>
    <Spacer size="0.5rem" />
    <Text size="0.85rem" color="var(--fgMuted)">Projects the current scene to your playfield.</Text>
    <Spacer />
    <Hr />
    <Spacer />
  {/if}
  <Button variant="danger" onclick={handleToggleGamePause}>
    {#if gameSession.isPaused}Unpause playfield{:else}Pause playfield{/if}
  </Button>
  <Spacer size="0.5rem" />
  <Text size="0.85rem" color="var(--fgMuted)">Displays your party's pause screen instead of a scene.</Text>
</div>

<style>
  .playControls {
    width: 16rem;
  }
</style>
