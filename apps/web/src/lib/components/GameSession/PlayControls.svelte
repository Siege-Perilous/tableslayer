<script lang="ts">
  import { Spacer, Button, Text, Hr, addToast } from '@tableslayer/ui';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectScene } from '$lib/db/gs/schema';
  import type { SelectGameSettings } from '$lib/db/gs/schema';
  import { createSetActiveSceneMutation, createToggleGamePauseMutation } from '$lib/queries';

  let {
    socketUpdate,
    party,
    gameSession,
    selectedScene,
    activeScene,
    gameSettings
  }: {
    socketUpdate: () => void;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeScene: SelectScene | (SelectScene & Thumb) | null;
    gameSettings: SelectGameSettings;
  } = $props();

  const setActiveScene = createSetActiveSceneMutation();
  const handleSetActiveScene = async () => {
    if (!selectedScene || (activeScene && selectedScene.id === activeScene.id)) return;

    const response = await $setActiveScene.mutateAsync({
      dbName: gameSession.dbName,
      sceneId: selectedScene.id,
      partyId: party.id
    });
    if (response.success == true) {
      addToast({
        data: {
          title: 'Active scene set',
          type: 'success'
        }
      });
    }
  };

  const toggleGamePause = createToggleGamePauseMutation();
  const handleToggleGamePause = async () => {
    console.log(`toggle game pause for ${gameSession.dbName}`);
    if (!selectedScene) return;
    const response = await $toggleGamePause.mutateAsync({
      dbName: gameSession.dbName,
      partyId: party.id
    });
    if (response.success == true) {
      addToast({
        data: {
          title: 'Game paused',
          type: 'success'
        }
      });
    }
    socketUpdate();
  };
</script>

<div class="playControls">
  <Button href={`/${party.slug}/${gameSession.slug}/share`} target="_blank">Open playfield</Button>
  <Spacer size={2} />
  <Text size="0.85rem" color="var(--fgMuted)"
    >This will open a new tab with the playfield. Fullscreen it on your display.</Text
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
    {#if gameSettings.isPaused}Unpause playfield{:else}Pause playfield{/if}
  </Button>
  <Spacer size={2} />
  <Text size="0.85rem" color="var(--fgMuted)">Displays your party's pause screen instead of a scene.</Text>
</div>

<style>
  .playControls {
    width: 16rem;
  }
</style>
