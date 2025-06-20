<script lang="ts">
  import { Spacer, Button, Text, Hr } from '@tableslayer/ui';
  import type { SelectParty, SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { useUpdatePartyMutation } from '$lib/queries/parties';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { usePartyData } from '$lib/utils/yjs/stores';

  let {
    party,
    selectedScene,
    activeSceneId,
    partyData
  }: {
    party: SelectParty & Thumb;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    partyData: ReturnType<typeof usePartyData> | null;
  } = $props();

  const updateParty = useUpdatePartyMutation();
  const handleSetActiveScene = async () => {
    if (!selectedScene || (activeSceneId && selectedScene.id === activeSceneId)) return;

    await handleMutation({
      mutation: () =>
        $updateParty.mutateAsync({
          partyId: party.id,
          partyData: { activeSceneId: selectedScene.id }
        }),
      formLoadingState: () => {},
      onSuccess: () => {
        // Update active scene in Y.js instead of invalidateAll()
        if (partyData) {
          partyData.updatePartyState('activeSceneId', selectedScene.id);
        }
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

  const canSetActiveScene = $derived(!activeSceneId || selectedScene.id !== activeSceneId);
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
