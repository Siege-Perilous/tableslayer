<script lang="ts">
  import { Spacer, Button, Text, Hr } from '@tableslayer/ui';
  import type { SelectGameSession, SelectParty, SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { useUpdateGameSessionMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
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
          body: (err: Error) => err.message || 'Error setting active scene'
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
        error: { title: 'Error pausing playfield', body: (err: Error) => err.message || 'Error pausing playfield' }
      }
    });
  };
</script>

<div class="playControls">
  <Button
    href={`/${party.slug}/${gameSession.slug}/share`}
    target="_blank"
    onclick={() => window.open(`/${party.slug}/${gameSession.slug}/share`, 'newwindow', 'width=300,height=250')}
    >Open playfield</Button
  >
  <Spacer size={2} />
  <Text size="0.85rem" color="var(--fgMuted)"
    >This will open a new window with the playfield. Fullscreen it on your display.</Text
  >
  <Spacer />
  <Hr />
  <Spacer />
  {#if !activeScene || selectedScene.id !== activeScene.id}
    <Button onclick={handleSetActiveScene}>Set active scene</Button>
    <Spacer size={2} />
    <Text size="0.85rem" color="var(--fgMuted)">Projects the current scene to your playfield.</Text>
    <Spacer />
    <Hr />
    <Spacer />
  {/if}
  <Button variant="danger" onclick={handleToggleGamePause}>
    {#if gameSession.isPaused}Unpause playfield{:else}Pause playfield{/if}
  </Button>
  <Spacer size={2} />
  <Text size="0.85rem" color="var(--fgMuted)">Displays your party's pause screen instead of a scene.</Text>
</div>

<style>
  .playControls {
    width: 16rem;
  }
</style>
