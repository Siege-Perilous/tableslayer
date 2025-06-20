<script lang="ts">
  import { IconButton, FileInput, Icon, FormControl, Input, Popover, Button, ColorMode } from '@tableslayer/ui';
  import {
    IconCheck,
    IconX,
    IconPhoto,
    IconChevronDown,
    IconPlayerPlayFilled,
    IconPlayerPauseFilled,
    IconGripVertical
  } from '@tabler/icons-svelte';
  import type { SelectParty, SelectScene } from '$lib/db/app/schema';
  import { UpdateMapImage, openFileDialog } from './';
  import { hasThumb, generateSmallThumbnailUrl } from '$lib/utils';
  import type { SelectGameSession } from '$lib/db/app/schema';
  import { type Thumb } from '$lib/server';
  import {
    useUploadFileMutation,
    useCreateSceneMutation,
    useDeleteSceneMutation,
    useUpdateSceneMutation,
    useReorderScenesMutation,
    useDuplicateSceneMutation
  } from '$lib/queries';
  import { useUpdatePartyMutation } from '$lib/queries/parties';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { PartyUpgrade } from '../party';
  import { flip } from 'svelte/animate';
  import { sineOut } from 'svelte/easing';
  import { navigating } from '$app/state';
  import { onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { usePartyData } from '$lib/utils/yjs/stores';

  let {
    scenes,
    gameSession,
    selectedSceneNumber,
    activeSceneId,
    party,
    partyData,
    isLocallyReordering = $bindable(false)
  }: {
    scenes: (SelectScene | (SelectScene & Thumb))[];
    gameSession: SelectGameSession;
    selectedSceneNumber: number;
    party: SelectParty & Thumb;
    activeSceneId: string | undefined;
    partyData: ReturnType<typeof usePartyData> | null;
    isLocallyReordering?: boolean;
  } = $props();

  let file = $state<FileList | null>(null);
  let formIsLoading = $state(false);
  let sceneBeingDeleted = $state('');
  let createSceneErrors = $state<FormMutationError | undefined>(undefined);
  let renamingScenes = $state<Record<string, string | null>>({});
  let openScenePopover = $state<string | null>(null);
  let orderedScenes = $state<(SelectScene | (SelectScene & Thumb))[]>([]);
  let needsToUpgrade = $derived(party.plan === 'free' && orderedScenes.length >= 3);
  let isNewSceneAdded = $state(false);

  // Flag to prevent context menu after drag
  let justFinishedDragging = $state(false);

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
  const updateParty = useUpdatePartyMutation();
  const reorderScenes = useReorderScenesMutation();
  const duplicateScene = useDuplicateSceneMutation();

  // Check if a scene is currently being renamed
  const isSceneBeingRenamed = (sceneId: string) => {
    return renamingScenes[sceneId] !== null && renamingScenes[sceneId] !== undefined;
  };

  // Determine if dragging should be disabled for a particular scene
  const isDragDisabled = (sceneId: string) => {
    return formIsLoading || isSceneBeingRenamed(sceneId) || sceneBeingDeleted === sceneId;
  };

  const cleanupDragPreview = () => {
    if (dragPreviewElement) {
      try {
        document.body.removeChild(dragPreviewElement);
      } catch {
        // Element might already be removed
        console.log('Element already removed from DOM');
      }
      dragPreviewElement = null;
    }
  };

  $effect(() => {
    // Cleanup drag preview on unmount
    if (navigating || formIsLoading) {
      return cleanupDragPreview;
    }
  });

  onDestroy(() => {
    cleanupDragPreview();
  });

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
      onSuccess: (response) => {
        // Add scene to Y.js for real-time sync instead of invalidateAll()
        if (partyData && response?.scene) {
          const newScene = response.scene;
          console.log('Scene created successfully, adding to Y.js:', newScene.name);
          partyData.addScene({
            id: newScene.id,
            name: newScene.name,
            order: newScene.order,
            mapLocation: newScene.mapLocation || undefined,
            mapThumbLocation: newScene.mapThumbLocation || undefined,
            gameSessionId: newScene.gameSessionId,
            thumb: hasThumb(newScene)
              ? {
                  resizedUrl: newScene.thumb.resizedUrl,
                  originalUrl: newScene.thumb.url
                }
              : undefined
          });
        } else {
          console.warn(
            'Cannot add scene to Y.js - partyData not available or response missing scene:',
            !!partyData,
            !!response?.scene
          );
        }
        isNewSceneAdded = true;
        file = null;
        setTimeout(() => {
          isNewSceneAdded = false;
        }, 3000);
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
        $updateParty.mutateAsync({
          partyId: party.id,
          partyData: { activeSceneId: sceneId }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        // Update party state in Y.js instead of invalidateAll()
        if (partyData) {
          console.log('SceneSelector: Updating Y.js party state with activeSceneId:', sceneId);
          partyData.updatePartyState('activeSceneId', sceneId);
        }
        // The Y.js effect in the main page will handle broadcasting
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
      onSuccess: (response) => {
        sceneBeingDeleted = '';
        // Update Y.js with the reordered scenes list instead of just removing one
        if (partyData && response?.scenes) {
          console.log('Scene deleted successfully, updating Y.js with reordered scenes');
          const reorderedScenes = response.scenes.map((scene) => ({
            id: scene.id,
            name: scene.name,
            order: scene.order,
            mapLocation: scene.mapLocation || undefined,
            mapThumbLocation: scene.mapThumbLocation || undefined,
            gameSessionId: scene.gameSessionId,
            thumb: hasThumb(scene)
              ? {
                  resizedUrl: scene.thumb.resizedUrl,
                  originalUrl: scene.thumb.url
                }
              : undefined
          }));
          partyData.reorderScenes(reorderedScenes);
        } else {
          console.warn(
            'Cannot update scenes in Y.js - partyData not available or response missing scenes:',
            !!partyData,
            !!response?.scenes
          );
        }
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
        // Update scene name in Y.js instead of invalidateAll()
        if (partyData && name) {
          partyData.updateScene(sceneId, { name });
        }
      },
      toastMessages: {
        success: { title: 'Scene renamed' },
        error: { title: 'Error renaming scene', body: (error) => error.message || 'Error renaming scene' }
      }
    });
  };

  const handleDuplicateScene = async (sceneId: string) => {
    await handleMutation({
      mutation: () =>
        $duplicateScene.mutateAsync({
          partyId: party.id,
          sceneId
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: (response) => {
        // Update Y.js with the reordered scenes list to ensure proper insertion order
        if (partyData && response?.scenes) {
          console.log('Scene duplicated successfully, updating Y.js with reordered scenes');
          const reorderedScenes = response.scenes.map((scene) => ({
            id: scene.id,
            name: scene.name,
            order: scene.order,
            mapLocation: scene.mapLocation || undefined,
            mapThumbLocation: scene.mapThumbLocation || undefined,
            gameSessionId: scene.gameSessionId,
            thumb: hasThumb(scene)
              ? {
                  resizedUrl: scene.thumb.resizedUrl,
                  originalUrl: scene.thumb.url
                }
              : undefined
          }));
          partyData.reorderScenes(reorderedScenes);
        } else {
          console.warn(
            'Cannot update scenes in Y.js - partyData not available or response missing scenes:',
            !!partyData,
            !!response?.scenes
          );
        }
      },
      toastMessages: {
        success: { title: 'Scene duplicated' },
        error: { title: 'Error duplicating scene', body: (error) => error.message || 'Error duplicating scene' }
      }
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, index: number, sceneId: string) => {
    // If dragging is disabled for this scene, prevent the drag operation
    if (isDragDisabled(sceneId)) {
      e.preventDefault();
      return;
    }

    draggedItem = index;
    isDragging = true;
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem = index;
  };

  const handleDragEnd = async () => {
    isDragging = false;

    // Set the flag to prevent context menu from opening
    justFinishedDragging = true;

    // Reset the flag after a short delay
    setTimeout(() => {
      justFinishedDragging = false;
    }, 300); // Short delay to ensure context menu event is blocked

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

    // Create a copy of the scenes array for local manipulation
    const updatedScenes = [...scenes];

    // Remove the dragged item
    const [removed] = updatedScenes.splice(draggedItem, 1);

    // Insert at the new position
    updatedScenes.splice(dragOverItem, 0, removed);

    // Update the order properties to reflect the new sequence
    updatedScenes.forEach((scene, index) => {
      scene.order = index + 1;
    });

    // Update local state immediately
    orderedScenes = updatedScenes;

    // Temporarily prevent further dragging while updating
    formIsLoading = true;

    // Set flag to prevent navigation in the origin editor
    isLocallyReordering = true;

    try {
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
          // Update scene order in Y.js instead of invalidateAll()
          if (partyData) {
            partyData.reorderScenes(
              updatedScenes.map((scene) => ({
                id: scene.id,
                name: scene.name,
                order: scene.order,
                mapLocation: scene.mapLocation || undefined,
                mapThumbLocation: scene.mapThumbLocation || undefined,
                gameSessionId: scene.gameSessionId,
                thumb: hasThumb(scene)
                  ? {
                      resizedUrl: scene.thumb.resizedUrl,
                      originalUrl: scene.thumb.url
                    }
                  : undefined
              }))
            );
          }
        },
        toastMessages: {
          success: { title: 'Scenes reordered' },
          error: { title: 'Error reordering scenes', body: (error) => error.message || 'Error reordering scenes' }
        }
      });

      // Reset drag states after success
      draggedItem = null;
      dragOverItem = null;

      // Y.js handles sync automatically - no need for invalidateAll()
    } catch (error) {
      // On failure, revert to original order
      console.error('Error updating scene order:', error);
      // Y.js will automatically revert if the server operation failed
    } finally {
      formIsLoading = false;
      // Reset the flag after a small delay to ensure navigation effect has run
      setTimeout(() => {
        isLocallyReordering = false;
      }, 500);
    }
  };

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    // Use requestAnimationFrame to ensure the component re-renders with the new sceneId first
    requestAnimationFrame(() => {
      openFileDialog();
    });
  };

  const handleFileChange = (event: Event) => {
    event.preventDefault();
    if (file && file.length) {
      handleCreateScene(scenes.length + 1);
    }
  };

  const handleContextMenu = (event: MouseEvent, sceneId: string) => {
    // Prevent context menu from opening if we just finished dragging
    if (justFinishedDragging) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    // Extra logic because the popover has internal methods in conflict
    if (openScenePopover === sceneId) {
      openScenePopover = null;
      setTimeout(() => {
        openScenePopover = sceneId;
      }, 0);
    } else {
      openScenePopover = sceneId;
    }
  };

  const applyDragPreviewStyles = (preview: HTMLElement, original: HTMLElement, event: DragEvent) => {
    const rect = original.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    Object.assign(preview.style, {
      width: `${original.offsetWidth}px`,
      height: `${original.offsetHeight}px`,
      position: 'fixed',
      transition: 'none',
      borderColor: 'var(--fg)',
      backgroundColor: 'var(--bg)',
      cursor: 'grabbing',
      zIndex: '10',
      pointerEvents: 'none',
      left: `${event.clientX - offsetX}px`,
      top: `${event.clientY - offsetY}px`
    });

    return { offsetX, offsetY };
  };

  $effect(() => {
    orderedScenes = [...scenes];
  });
</script>

<div class="scenes" id="scenes">
  <div class="scene__input">
    {#if needsToUpgrade}
      <PartyUpgrade {party} limitText="Free plan limited to 3 scenes" />
    {:else}
      <FormControl name="file" errors={createSceneErrors && createSceneErrors.errors}>
        {#snippet input({ inputProps })}
          <Button class="scene__inputBtn" isLoading={formIsLoading} disabled={formIsLoading}>
            {#snippet start()}
              <Icon Icon={IconPhoto} size="1.25rem" />
            {/snippet}
            Add scene
            <FileInput
              variant="transparent"
              {...inputProps}
              type="file"
              bind:files={file}
              onchange={handleFileChange}
            />
          </Button>
        {/snippet}
      </FormControl>
    {/if}
  </div>
  <div class="scene__list">
    {#each orderedScenes as scene, index (scene.id)}
      <div
        animate:flip={{ delay: 100, duration: 200, easing: sineOut }}
        in:fly={{ x: -50, duration: 150, delay: isNewSceneAdded ? 0 : index * 50, easing: sineOut }}
        role="presentation"
        id={`scene-${scene.order}`}
        class={[
          'scene',
          scene.order === selectedSceneNumber && 'scene--isSelected',
          sceneBeingDeleted === scene.id && 'scene--isLoading',
          isDragging && draggedItem === index && 'scene--dragging',
          isDragging && dragOverItem === index && 'scene--dropTarget',
          isDragDisabled(scene.id) && 'scene--no-drag'
        ]}
        style:background-image={scene.mapThumbLocation
          ? `url('${generateSmallThumbnailUrl(scene.mapThumbLocation)}')`
          : scene.mapLocation && scene.mapLocation !== 'map/example1080.png'
            ? `url('${generateSmallThumbnailUrl(scene.mapLocation)}')`
            : 'inherit'}
        oncontextmenu={(event) => handleContextMenu(event, scene.id)}
        draggable={!isDragDisabled(scene.id)}
        ondragstart={(e) => {
          if (formIsLoading || isDragDisabled(scene.id)) {
            e.preventDefault();
            return;
          }
          // Create an invisible drag image (1x1 transparent pixel)
          if (e.dataTransfer) {
            const emptyImg = new Image();
            emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(emptyImg, 0, 0);

            const original = e.currentTarget as HTMLElement;
            const preview = original.cloneNode(true) as HTMLElement;
            const { offsetX, offsetY } = applyDragPreviewStyles(preview, original, e);

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
          handleDragStart(e, index, scene.id);
        }}
        ondragover={(e) => handleDragOver(e, index)}
        ondragend={handleDragEnd}
      >
        {#if isSceneBeingRenamed(scene.id)}
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
        <a
          href={`/${party.slug}/${gameSession.slug}/${scene.order}`}
          class="scene__link"
          onclick={(e) => {
            // Only navigate if we're not dragging (prevent link activation during drag)
            if (isDragging) {
              e.preventDefault();
            }
          }}
          onpointerdown={(e) => {
            // Mark the target anchor to prevent default behavior on mobile
            e.currentTarget.setAttribute('data-dragging', 'false');
          }}
          onpointermove={(e) => {
            // If pointer moves, we're likely dragging
            e.currentTarget.setAttribute('data-dragging', 'true');
          }}
          onpointerup={(e) => {
            // On pointer up, check if we were dragging
            const wasDragging = e.currentTarget.getAttribute('data-dragging') === 'true';
            if (wasDragging) {
              e.preventDefault();
              e.currentTarget.removeAttribute('data-dragging');
            }
          }}
        >
          {#if activeSceneId && activeSceneId === scene.id}
            <div class="scene__projectedIcon">
              {#if !gameSession.isPaused}
                <Icon Icon={IconPlayerPlayFilled} color="var(--fgPrimary)" />
                Active on table
              {:else}
                <Icon Icon={IconPlayerPauseFilled} color="var(--fgPrimary)" />
                Paused on table
              {/if}
            </div>
          {/if}
          <div class="scene__text">{scene.order} - {renamingScenes[scene.id] || scene.name}</div>
        </a>
        <div class="scene__dragHandle" class:scene__dragHandle--disabled={isDragDisabled(scene.id)}>
          <Icon Icon={IconGripVertical} size="1.25rem" class="scene__dragHandleIcon" />
        </div>
        <Popover
          triggerClass="scene__popoverBtn"
          isOpen={openScenePopover === scene.id}
          positioning={{ placement: 'bottom-end' }}
          portal={document.getElementById('scenes')}
        >
          {#snippet trigger()}
            <ColorMode mode="dark">
              <IconButton as="div" variant="ghost">
                <Icon Icon={IconChevronDown} />
              </IconButton>
            </ColorMode>
          {/snippet}
          {#snippet content({ contentProps })}
            <button
              class={['scene__menuItem', needsToUpgrade && 'scene__menuItem--disabled']}
              disabled={needsToUpgrade}
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
              class={['scene__menuItem', needsToUpgrade && 'scene__menuItem--disabled']}
              disabled={needsToUpgrade}
              onclick={() => {
                handleDuplicateScene(scene.id);
                contentProps.close();
              }}
            >
              Duplicate scene
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

  <UpdateMapImage sceneId={contextSceneId} partyId={party.id} {partyData} />
</div>

<style>
  :global(.light) {
    .scene__projectedIcon {
      background: var(--fgPrimary);
    }
  }
  .scenes {
    border-right: var(--borderThin);
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--bg);
    overflow-y: auto;
    flex-grow: 1;
    transition: border-color 0.2s;
    container-type: inline-size;
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
  .scene:hover:not(.scene--isSelected):not(.scene--dragging):not(.scene--no-drag) {
    border-color: var(--primary-800);
  }
  .scene--dragging {
    opacity: 0.3;
    border-color: var(--contrastMedium) !important;
  }
  .scene--no-drag {
    cursor: default;
  }
  .scene__link {
    content: '';
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    z-index: 2;
    -webkit-touch-callout: none;
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
    font-weight: 800;
    text-transform: uppercase;
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
    gap: 1rem;
    height: fit-content;
    min-height: 0;
    flex-grow: 1;
    align-content: start;
    overflow-y: auto;
    padding: 2rem 2rem;
  }
  .scene__dragHandle {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 2;
    opacity: 0;
  }

  .scene__dragHandle--disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .scene:hover .scene__dragHandle:not(.scene__dragHandle--disabled) {
    opacity: 1;
  }

  :global {
    .scene__inputBtn {
      width: 100%;
      position: relative;
    }
    .scene__popoverBtn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 2;
    }
    .scene__dragHandleIcon {
      color: white;
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    }

    @media (max-width: 768px) {
      .scene__inputBtn {
        width: auto;
        margin: 0 auto;
      }
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

  .scene__menuItem--disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  @container (min-width: 250px) {
    .scene__list {
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    }
  }
</style>
