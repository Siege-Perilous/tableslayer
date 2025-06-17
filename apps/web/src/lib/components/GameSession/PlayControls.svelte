<script lang="ts">
  import { Spacer, Button, Text, Hr } from '@tableslayer/ui';
  import type { SelectGameSession, SelectParty, SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { useUpdateGameSessionMutation } from '$lib/queries';
  import { useUpdatePartyMutation } from '$lib/queries/parties';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { usePartyData } from '$lib/utils/yjs/stores';

  let {
    socketUpdate,
    party,
    gameSession,
    selectedScene,
    activeScene,
    partyData
  }: {
    socketUpdate: () => void;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeScene: SelectScene | (SelectScene & Thumb) | null;
    partyData: ReturnType<typeof usePartyData> | null;
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
        // Update active scene in Y.js instead of invalidateAll()
        if (partyData) {
          partyData.updatePartyState('activeSceneId', selectedScene.id);
        }
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
    await handleMutation({
      mutation: () =>
        $updateParty.mutateAsync({
          partyId: party.id,
          partyData: { gameSessionIsPaused: !party.gameSessionIsPaused }
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        // Update pause state in Y.js instead of invalidateAll()
        if (partyData) {
          partyData.updatePartyState('isPaused', !party.gameSessionIsPaused);
        }
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

  // Create a reactive derived for button visibility to ensure proper reactivity
  const isActiveSession = $derived(gameSession.id === party.activeGameSessionId);
  const canSetActiveScene = $derived(!activeScene || selectedScene.id !== activeScene.id);

  const handleSetActiveGameSession = async () => {
    if (isActiveSession) return;

    await handleMutation({
      mutation: () =>
        $updateParty.mutateAsync({
          partyId: party.id,
          partyData: { activeGameSessionId: gameSession.id }
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        // Update active game session in Y.js instead of invalidateAll()
        if (partyData) {
          partyData.updatePartyState('activeGameSessionId', gameSession.id);
        }
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
  {#if !isActiveSession}
    <Button onclick={handleSetActiveGameSession}>Set as active session</Button>
    <Spacer size="0.5rem" />
    <Text size="0.85rem" color="var(--fgMuted)">Makes this session active on the playfield.</Text>
    <Spacer />
    <Hr />
    <Spacer />
  {:else}
    <Text size="0.85rem" color="var(--fgMuted)">This session is currently active on the playfield.</Text>
    <Spacer />
    <Hr />
    <Spacer />
  {/if}
  {#if canSetActiveScene}
    <Button onclick={handleSetActiveScene}>Set active scene</Button>
    <Spacer size="0.5rem" />
    <Text size="0.85rem" color="var(--fgMuted)">Projects the current scene to your playfield.</Text>
    <Spacer />
    <Hr />
    <Spacer />
  {/if}
  <Button variant="danger" onclick={handleToggleGamePause}>
    {#if party.gameSessionIsPaused}Unpause playfield{:else}Pause playfield{/if}
  </Button>
  <Spacer size="0.5rem" />
  <Text size="0.85rem" color="var(--fgMuted)">Displays your party's pause screen instead of a scene.</Text>
</div>

<style>
  .playControls {
    width: 16rem;
  }
</style>
