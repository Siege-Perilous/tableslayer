<script lang="ts">
  import { IconButton, FileInput, Icon, FormControl, Input, Popover } from '@tableslayer/ui';
  import { IconCheck, IconX, IconChevronDown, IconGripVertical } from '@tabler/icons-svelte';
  import type { SelectParty, SelectScene } from '$lib/db/app/schema';
  import { UpdateMapImage, openFileDialog } from './';
  import { hasThumb } from '$lib/utils';
  import type { SelectGameSession } from '$lib/db/app/schema';
  import { type Thumb } from '$lib/server';
  import {
    useUploadFileMutation,
    useCreateSceneMutation,
    useDeleteSceneMutation,
    useUpdateSceneMutation,
    useUpdateGameSessionMutation
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
  let openScenePopover = $state<string | null>(null);

  // Drag and drop states
  let draggedItem = $state<number | null>(null);
  let dragOverItem = $state<number | null>(null);
  let isDragging = $state(false);

  const uploadFile = useUploadFileMutation();
  const createNewScene = useCreateSceneMutation();
  const deleteScene = useDeleteSceneMutation();
  const updateScene = useUpdateSceneMutation();
  const updateGameSession = useUpdateGameSessionMutation();

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
          partyId: party.id,
          sceneData: {
            gameSessionId: gameSession.id,
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
        $updateGameSession.mutateAsync({
          gameSessionId: gameSession.id,
          gameSessionData: { activeSceneId: sceneId },
          partyId: party.id
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        invalidateAll();
      },
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
          gameSessionId: gameSession.id,
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

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    draggedItem = index;
    isDragging = true;
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem = index;
  };

  const handleDragEnd = async () => {
    isDragging = false;
    if (draggedItem === null || dragOverItem === null || draggedItem === dragOverItem) {
      draggedItem = null;
      dragOverItem = null;
      return;
    }

    // Get the scene that was dragged
    const draggedScene = scenes[draggedItem];
    const draggedOrder = draggedScene.order;
    const targetOrder = scenes[dragOverItem].order;

    // Temporarily prevent further dragging while updating
    formIsLoading = true;

    try {
      // Create a copy of scenes and sort by order for processing
      const orderedScenes = [...scenes].sort((a, b) => a.order - b.order);

      // We need to handle the SQLite unique constraint on (session_id, order)
      // To do this, we'll use negative numbers as temporary orders to prevent conflicts

      // Step 1: Calculate which scenes need to be updated
      const scenesToUpdate: { scene: SelectScene | (SelectScene & Thumb); newOrder: number }[] = [];

      if (draggedOrder < targetOrder) {
        // Moving down: All scenes between source and target (inclusive) get shifted
        for (const scene of orderedScenes) {
          if (scene.id === draggedScene.id) {
            scenesToUpdate.push({ scene, newOrder: targetOrder });
          } else if (scene.order > draggedOrder && scene.order <= targetOrder) {
            scenesToUpdate.push({ scene, newOrder: scene.order - 1 });
          }
        }
      } else {
        // Moving up: All scenes between target and source (inclusive) get shifted
        for (const scene of orderedScenes) {
          if (scene.id === draggedScene.id) {
            scenesToUpdate.push({ scene, newOrder: targetOrder });
          } else if (scene.order >= targetOrder && scene.order < draggedOrder) {
            scenesToUpdate.push({ scene, newOrder: scene.order + 1 });
          }
        }
      }

      // Step 2: First move all affected scenes to temporary negative orders
      // This ensures we don't violate the unique constraint during updates
      const tempUpdates: Array<Promise<unknown>> = [];
      const finalUpdates: Array<Promise<unknown>> = [];

      // Use a large negative offset to ensure no conflicts with regular orders
      const offset = -10000;

      // First pass: move to negative temporary orders
      for (let i = 0; i < scenesToUpdate.length; i++) {
        const { scene } = scenesToUpdate[i];
        const tempOrder = offset - i; // Each gets a unique negative order

        tempUpdates.push(
          $updateScene.mutateAsync({
            partyId: party.id,
            sceneId: scene.id,
            sceneData: { order: tempOrder }
          })
        );
      }

      // Execute all temporary updates first
      await Promise.all(tempUpdates);

      // Second pass: move to final orders
      for (const { scene, newOrder } of scenesToUpdate) {
        finalUpdates.push(
          $updateScene.mutateAsync({
            partyId: party.id,
            sceneId: scene.id,
            sceneData: { order: newOrder }
          })
        );
      }

      // Execute all final updates
      await Promise.all(finalUpdates);

      // Refresh UI data
      invalidateAll();
    } catch (error) {
      console.error('Error updating scene orders:', error);
    } finally {
      formIsLoading = false;
      draggedItem = null;
      dragOverItem = null;
    }
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
    {#each scenes as scene, index}
      <div
        role="presentation"
        id={`scene-${scene.order}`}
        class={[
          'scene',
          scene.order === selectedSceneNumber && 'scene--isSelected',
          sceneBeingDeleted === scene.id && 'scene--isLoading',
          isDragging && draggedItem === index && 'scene--dragging',
          isDragging && dragOverItem === index && 'scene--drop-target'
        ]}
        style:background-image={hasThumb(scene) ? `url('${scene.thumb.resizedUrl}')` : 'inherit'}
        oncontextmenu={(event) => {
          event.preventDefault();
          // Extra logic because the popover has internal methods in conflict
          if (openScenePopover === scene.id) {
            openScenePopover = null;
            setTimeout(() => {
              openScenePopover = scene.id;
            }, 0);
          } else {
            openScenePopover = scene.id;
          }
        }}
        draggable={true}
        ondragstart={(e) => {
          // Ensure the entire card is used as the ghost image
          // by setting an offset that keeps the ghost centered
          if (e.dataTransfer) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, offsetX, offsetY);
          }
          handleDragStart(index);
        }}
        ondragover={(e) => handleDragOver(e, index)}
        ondragend={handleDragEnd}
      >
        {#if renamingScenes[scene.id] !== null && renamingScenes[scene.id] !== undefined}
          <div class="scene__rename">
            <form onsubmit={() => handleRenameScene(scene.id)}>
              <div class="scene__renameInput">
                <FormControl label="Name" name="name">
                  {#snippet input({ inputProps })}
                    <Input type="text" {...inputProps} bind:value={renamingScenes[scene.id]} hideAutocomplete />
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
            <div class="scene__projectedIcon">Active on table</div>
          {/if}
          <div class="scene__text">{scene.order} - {renamingScenes[scene.id] || scene.name}</div>
        </a>
        <div class="scene__dragHandle">
          <Icon Icon={IconGripVertical} color="var(--fgMuted)" size="1.25rem" />
        </div>
        <Popover
          triggerClass="scene__popoverBtn"
          isOpen={openScenePopover === scene.id}
          positioning={{ placement: 'bottom-end' }}
        >
          {#snippet trigger()}
            <IconButton as="div" variant="ghost">
              <Icon Icon={IconChevronDown} />
            </IconButton>
          {/snippet}
          {#snippet content({ contentProps })}
            <button
              class="scene__menuItem"
              onclick={() => {
                handleCreateScene(scene.order + 1);
                contentProps.close();
              }}
            >
              New scene
            </button>
            <button
              class="scene__menuItem"
              onclick={() => {
                renamingScenes[scene.id] = scene.name;
                contentProps.close();
              }}
            >
              Rename scene
            </button>
            <button
              class="scene__menuItem"
              onclick={() => {
                handleMapImageChange(scene.id);
                contentProps.close();
              }}
            >
              Change map image
            </button>
            <button
              class="scene__menuItem"
              onclick={() => {
                handleDeleteScene(scene.id);
                contentProps.close();
              }}
            >
              Delete scene
            </button>
            <button
              class="scene__menuItem"
              onclick={() => {
                handleSetActiveScene(scene.id);
                contentProps.close();
              }}
            >
              Set active scene
            </button>
          {/snippet}
        </Popover>
      </div>
    {/each}
  </div>

  <UpdateMapImage sceneId={contextSceneId} partyId={party.id} />
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
    background-size: cover;
    background-position: center;
    box-shadow: 1px 1px 32px 4px rgba(0, 0, 0, 0.76) inset;
    display: block;
    background-color: var(--contrastLow);
    -webkit-touch-callout: none;
    cursor: grab;
    transition:
      opacity 0.2s ease,
      border-color 0.2s ease;
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
  .scene:hover:not(.scene--isSelected):not(.scene--dragging) {
    border-color: var(--primary-800);
  }
  .scene--dragging {
    opacity: 0.4;
    border-color: blue;
  }
  .scene--drop-target {
    border-color: blue;
    box-shadow: 0 0 10px blue;
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
    padding: 0.5rem;
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 50%;
    width: 100%;
    font-size: 0.875rem;
    transform: translate(0%, -50%);
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
  .scene__dragHandle {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 2;
    padding: 0.25rem;
    background: var(--bg);
    border-radius: var(--radius-1);
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }

  .scene:hover .scene__dragHandle {
    opacity: 1;
  }
  :global {
    .scene__inputBtn {
      width: 100%;
    }
    .scene__popoverBtn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 2;
    }
  }

  .scene__menuItem {
    text-align: left;
    white-space: nowrap;
    width: 100%;
    padding: 0.25rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    gap: 0.5rem;
    border: solid 2px transparent;
    gap: 1rem;
  }

  .scene__menuItem:hover,
  .scene__menuItem:focus-visible {
    background-color: var(--menuItemHover);
    border: var(--menuItemBorderHover);
  }
</style>
