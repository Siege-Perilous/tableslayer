<script lang="ts">
  import type { SelectParty, SelectScene } from '$lib/db/app/schema';
  import type { SessionDocClient } from '$lib/realtime';
  import type { Thumb } from '$lib/server';
  import { trackChecklistItem } from '$lib/utils';
  import { Button, Hr, Spacer, Text } from '@tableslayer/ui';

  let {
    party,
    selectedScene,
    activeSceneId,
    client
  }: {
    party: SelectParty & Thumb;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    client: SessionDocClient | null;
  } = $props();

  // Both writes go to the party doc; the PartyKit server persists them.
  const handleSetActiveScene = () => {
    if (!selectedScene || (activeSceneId && selectedScene.id === activeSceneId)) return;
    client?.party.setActiveScene(selectedScene.id);
    trackChecklistItem('change-scene');
  };

  const handleToggleGamePause = () => {
    client?.party.setPaused(!party.gameSessionIsPaused);
  };

  const canSetActiveScene = $derived(!activeSceneId || selectedScene.id !== activeSceneId);
</script>

<div class="playControls">
  <Button href={`/${party.slug}/play`} target="_blank" onclick={() => trackChecklistItem('launch-playfield')}>
    Open playfield
  </Button>
  <Spacer size="0.5rem" />
  <Text size="0.85rem" color="var(--fgMuted)">
    This will open a new tab with the playfield. Fullscreen it on your display.
  </Text>
  <Spacer />
  <Hr />
  <Spacer />
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
