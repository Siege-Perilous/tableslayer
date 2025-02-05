<script lang="ts">
  import { IconButton, FileInput, Icon, ContextMenu, FormControl, Input } from '@tableslayer/ui';
  import { IconScreenShare, IconCheck, IconX } from '@tabler/icons-svelte';
  import type { SelectScene } from '$lib/db/gs/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import { UpdateMapImage, openFileDialog } from './';
  import { hasThumb } from '$lib/utils';
  import type { SelectGameSession } from '$lib/db/app/schema';
  import { type Thumb } from '$lib/server';
  import {
    useUpdateGameSessionSettingsMutation,
    useUploadFileMutation,
    useCreateSceneMutation,
    useDeleteSceneMutation,
    useUpdateSceneMutation
  } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  let {
    scenes,
    gameSession,
    selectedSceneNumber,
    activeScene,
    party
  }: {
    scenes: (SelectScene | (SelectScene & Thumb))[];
    gameSession: SelectGameSession;
    selectedSceneNumber: number;
    party: SelectParty & Thumb;
    activeScene: SelectScene | (SelectScene & Thumb) | null;
  } = $props();

  let file = $state<FileList | null>(null);
  let formIsLoading = $state(false);
  let sceneBeingDeleted = $state('');
  let createSceneErrors = $state<FormMutationError | undefined>(undefined);
  let renamingScenes = $state<Record<string, string | null>>({});

  const uploadFile = useUploadFileMutation();
  const createNewScene = useCreateSceneMutation();
  const updateSettings = useUpdateGameSessionSettingsMutation();
  const deleteScene = useDeleteSceneMutation();
  const updateScene = useUpdateSceneMutation();

  const handleCreateScene = async (order: number) => {
    formIsLoading = true;
    let mapLocation: string | undefined = undefined;

    if (file && file.length) {
      const uploadedFile = await handleMutation({
        mutation: () => $uploadFile.mutateAsync({ file: file![0], folder: 'map' }),
        formLoadingState: (loading) => (formIsLoading = loading),
        toastMessages: {
          success: { title: 'File uploaded' },
          error: { title: 'Error uploading file', body: (error) => error.message }
        }
      });

      if (!uploadedFile) return;
      mapLocation = uploadedFile.location;
    }

    await handleMutation({
      mutation: () =>
        $createNewScene.mutateAsync({
          dbName: gameSession.dbName,
          partyId: party.id,
          sceneData: {
            name: 'New Scene',
            order,
            mapLocation
          }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        createSceneErrors = error;
        console.log('Error creating scene:', error);
      },
      onSuccess: () => {
        file = null;
      },
      toastMessages: {
        success: { title: 'Scene created successfully' },
        error: { title: 'Error creating scene' }
      }
    });
  };

  const handleSetActiveScene = async (sceneId: string) => {
    await handleMutation({
      mutation: () =>
        $updateSettings.mutateAsync({
          dbName: gameSession.dbName,
          settings: { activeSceneId: sceneId },
          partyId: party.id
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      toastMessages: {
        success: { title: 'Active scene set' },
        error: { title: 'Error setting active scene', body: (error) => error.message }
      }
    });
  };

  const handleDeleteScene = async (sceneId: string) => {
    sceneBeingDeleted = sceneId;

    await handleMutation({
      mutation: () =>
        $deleteScene.mutateAsync({
          dbName: gameSession.dbName,
          partyId: party.id,
          sceneId
        }),
      onSuccess: () => {
        sceneBeingDeleted = '';
      },
      onError: () => {
        sceneBeingDeleted = '';
      },
      formLoadingState: (loading) => (formIsLoading = loading),
      toastMessages: {
        success: { title: 'Scene deleted' },
        error: { title: 'Error deleting scene', body: (error) => error.message || 'Error deleting scene' }
      }
    });
  };

  const handleRenameScene = async (sceneId: string) => {
    const name = renamingScenes[sceneId];
    if (!name) return;

    await handleMutation({
      mutation: () =>
        $updateScene.mutateAsync({
          dbName: gameSession.dbName,
          partyId: party.id,
          sceneId,
          sceneData: { name }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        renamingScenes[sceneId] = null;
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Scene renamed' },
        error: { title: 'Error renaming scene', body: (error) => error.message || 'Error renaming scene' }
      }
    });
  };

  let sceneInputClasses = $derived(['scene', formIsLoading && 'scene--isLoading']);

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    openFileDialog();
  };

  const handleFileChange = (event: Event) => {
    event.preventDefault();
    if (file && file.length) {
      handleCreateScene(scenes.length + 1);
    }
  };
</script>

<div class="scenes">
  <div class="scene__input">
    <div class={sceneInputClasses}>
      <FormControl name="file" errors={createSceneErrors && createSceneErrors.errors}>
        {#snippet input({ inputProps })}
          <FileInput
            variant="dropzone"
            {...inputProps}
            type="file"
            accept="image/png, image/jpeg"
            bind:files={file}
            onchange={handleFileChange}
          />
        {/snippet}
      </FormControl>
    </div>
  </div>
  <div class="scene__list">
    {#each scenes as scene}
      <ContextMenu
        items={[
          { label: 'New scene', onclick: () => handleCreateScene(scene.order + 1) },
          {
            label: 'Delete',
            onclick: () => {
              handleDeleteScene(scene.id);
            }
          },
          { label: 'Duplicate scene', onclick: () => console.log('add') },
          { label: 'Rename scene', onclick: () => (renamingScenes[scene.id] = scene.name) },
          { label: 'Set active scene', onclick: () => handleSetActiveScene(scene.id) },
          {
            label: 'Update map image',
            onclick: () => handleMapImageChange(scene.id)
          }
        ]}
      >
        {#snippet trigger()}
          <div
            id={`scene-${scene.order}`}
            class={[
              'scene',
              scene.order === selectedSceneNumber && 'scene--isSelected',
              sceneBeingDeleted === scene.id && 'scene--isLoading'
            ]}
            style:background-image={hasThumb(scene) ? `url('${scene.thumb.resizedUrl}')` : 'inherit'}
          >
            {#if renamingScenes[scene.id] !== null && renamingScenes[scene.id] !== undefined}
              <div class="scene__rename">
                <form onsubmit={() => handleRenameScene(scene.id)}>
                  <div class="scene__renameInput">
                    <FormControl label="Name" name="name">
                      {#snippet input({ inputProps })}
                        <Input type="text" {...inputProps} bind:value={renamingScenes[scene.id]} />
                      {/snippet}
                    </FormControl>
                    <IconButton>
                      <Icon Icon={IconCheck} />
                    </IconButton>
                    <IconButton>
                      <Icon Icon={IconX} onclick={() => (renamingScenes[scene.id] = null)} />
                    </IconButton>
                  </div>
                </form>
              </div>
            {/if}
            <a href={`/${party.slug}/${gameSession.slug}/${scene.order}`} class="scene__link">
              {#if activeScene && activeScene.id === scene.id}
                <div class="scene__projectedIcon">
                  Active
                  <Icon Icon={IconScreenShare} size="1.25rem" stroke={2} />
                </div>
              {/if}
              <div class="scene__text">{scene.order} - {renamingScenes[scene.id] || scene.name}</div>
            </a>
          </div>
        {/snippet}
      </ContextMenu>
    {/each}
  </div>

  <UpdateMapImage sceneId={contextSceneId} dbName={gameSession.dbName} partyId={party.id} />
</div>

<style>
  .scenes {
    border-right: var(--borderThin);
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--bg);
    overflow-y: auto;
    transition: border-color 0.2s;
  }
  .scene {
    position: relative;
    border: var(--borderThick);
    border-radius: var(--radius-2);
    aspect-ratio: 16 / 9;
    width: 100%;
    overflow: hidden;
    background-size: 100%;
    box-shadow: 1px 1px 32px 4px rgba(0, 0, 0, 0.76) inset;
    display: block;
    background-color: var(--contrastLow);
    -webkit-touch-callout: none;
  }
  .scene:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    border-radius: var(--radius-2);
    border: solid var(--bg) 0.25rem;
  }
  .scene:hover:not(.scene--isSelected) {
    border-color: var(--primary-800);
  }
  .scene__link {
    content: '';
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    z-index: 2;
  }
  .scene__rename {
    gap: 1rem;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    padding: 2rem;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
  }
  .scene__renameInput {
    display: flex;
    align-items: end;
    gap: 0.5rem;
  }
  .scene--isSelected {
    border-width: 2px;
    border-color: var(--fgPrimary);
  }
  .scene--isLoading {
    opacity: 0.5;
  }
  .scene--isLoading::after {
    position: absolute;
    content: '';
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    background-image: linear-gradient(
      135deg,
      transparent 10%,
      transparent 10%,
      transparent 50%,
      var(--bg) 50%,
      var(--contrastMedium) 50%,
      transparent 60%,
      transparent 100%
    );
    background-size: 14.14px 14.14px;
  }
  .scene__text {
    position: absolute;
    left: 0.5rem;
    bottom: 0.5rem;
    z-index: 2;
    padding: 0.25rem 0.5rem;
    background: var(--bg);
    color: var(--fg);
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: calc(100% - 1rem);
    white-space: nowrap;
    font-size: 0.85rem;
  }
  .scene__projectedIcon {
    background: var(--fgPrimary);
    padding: 0.25rem;
    height: 1.5rem;
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2);
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.85rem;
    z-index: 2;
  }
  .scene__input {
    border-bottom: var(--borderThin);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding-bottom: 1rem;
    padding: 1rem 2rem;
  }
  .scene__input > * {
    width: 100%;
  }
  .scene__list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex-grow: 1;
    overflow-y: auto;
    padding: 2rem 2rem;
  }
  :global {
    .scene__inputBtn {
      width: 100%;
    }
  }
</style>
