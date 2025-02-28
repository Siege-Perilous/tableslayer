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
    useUpdateGameSessionMutation,
    useReorderScenesMutation
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

  // Custom drag preview element reference
  let dragPreviewElement: HTMLElement | null = null;

  const uploadFile = useUploadFileMutation();
  const createNewScene = useCreateSceneMutation();
  const deleteScene = useDeleteSceneMutation();
  const updateScene = useUpdateSceneMutation();
  const updateGameSession = useUpdateGameSessionMutation();
  const reorderScenes = useReorderScenesMutation();

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

    // Remove the drag preview element
    if (dragPreviewElement) {
      document.body.removeChild(dragPreviewElement);
      dragPreviewElement = null;
    }

    if (draggedItem === null || dragOverItem === null || draggedItem === dragOverItem) {
      draggedItem = null;
      dragOverItem = null;
      return;
    }

    // Get the scene that was dragged and the target order
    const draggedScene = scenes[draggedItem];
    const oldOrder = draggedScene.order;
    const newOrder = scenes[dragOverItem].order;

    // Temporarily prevent further dragging while updating
    formIsLoading = true;

    // Use our new reorderScenes mutation to handle all the updates in one go
    await handleMutation({
      mutation: () =>
        $reorderScenes.mutateAsync({
          partyId: party.id,
          gameSessionId: gameSession.id,
          sceneId: draggedScene.id,
          oldOrder,
          newOrder
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        // Reset drag states
        draggedItem = null;
        dragOverItem = null;

        // Refresh UI data
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Scene order updated' },
        error: { title: 'Error updating scene order', body: (error) => error.message || 'Error updating scene order' }
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
    {#each scenes as scene, index}
      <div
        role="presentation"
        id={`scene-${scene.order}`}
        class={[
          'scene',
          scene.order === selectedSceneNumber && 'scene--isSelected',
          sceneBeingDeleted === scene.id && 'scene--isLoading',
          isDragging && draggedItem === index && 'scene--dragging',
          isDragging && dragOverItem === index && 'scene--dropTarget'
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
          // Create an invisible drag image (1x1 transparent pixel)
          if (e.dataTransfer) {
            const emptyImg = new Image();
            emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(emptyImg, 0, 0);

            // Create the visible drag preview with exact opacity
            const original = e.currentTarget as HTMLElement;
            const preview = original.cloneNode(true) as HTMLElement;

            // Style the preview
            preview.style.width = original.offsetWidth + 'px';
            preview.style.height = original.offsetHeight + 'px';
            preview.classList.add('scene__draggingPreview');

            // Calculate initial position
            const rect = original.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            preview.style.left = e.clientX - offsetX + 'px';
            preview.style.top = e.clientY - offsetY + 'px';

            // Add to DOM
            document.body.appendChild(preview);
            dragPreviewElement = preview;

            // Add event listener to move the preview with the cursor
            document.addEventListener('dragover', (moveEvent) => {
              if (dragPreviewElement) {
                dragPreviewElement.style.left = moveEvent.clientX - offsetX + 'px';
                dragPreviewElement.style.top = moveEvent.clientY - offsetY + 'px';
              }
            });
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
          <Icon Icon={IconGripVertical} size="1.25rem" />
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
    container: true;
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
    opacity: 0.3;
    border-color: var(--contrastMedium) !important;
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
  .scene--dropTarget {
    border-color: var(--fg) !important;
    border-style: dashed;
  }
  .scene--isLoading,
  .scene--dropTarget {
    opacity: 0.5;
  }
  .scene--isLoading::after,
  .scene--dropTarget::after {
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 1rem;
    overflow-y: auto;
    padding: 2rem 2rem;
  }
  .scene__dragHandle {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 2;
    opacity: 0;
    > svg {
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    }
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

  .scene__draggingPreview {
    position: fixed;
    transition: none !important;
    border-color: var(--fg) !important;
    background-color: var(--bg) !important;
    cursor: grabbing;
    z-index: 10;
    pointer-events: none;
  }
</style>
