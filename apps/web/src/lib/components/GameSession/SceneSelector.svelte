<script lang="ts">
  import {
    IconButton,
    FileInput,
    Icon,
    FormControl,
    Input,
    Popover,
    Button,
    ColorMode,
    GridMode
  } from '@tableslayer/ui';
  import { devLog, devWarn, devError } from '$lib/utils/debug';
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
  import { hasThumb, generateSmallThumbnailUrl, isVideoFile } from '$lib/utils';
  import { extractDimensionsFromFilename } from '$lib/utils/gridDimensions';
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
  import { fly } from 'svelte/transition';
  import { usePartyData } from '$lib/utils/yjs/stores';
  import { useDragAndDrop } from '$lib/composables/useDragAndDrop.svelte';
  import { goto } from '$app/navigation';

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

  // Initialize drag and drop composable
  const dragAndDrop = useDragAndDrop({
    onReorder: handleReorderScenes,
    getItemId: (index: number) => index.toString(),
    isDisabled: (itemId: string) => {
      const index = parseInt(itemId);
      const scene = orderedScenes[index];
      return scene ? isDragDisabled(scene.id) : false;
    }
  });

  // Cleanup drag preview on navigation or form loading
  $effect(() => {
    if (navigating.to || formIsLoading) {
      dragAndDrop.cleanupDragPreview();
    }
  });

  const handleCreateScene = async (order: number, gridWidth?: number, gridHeight?: number) => {
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

    // Prepare scene data with grid settings if provided
    const sceneData: any = {
      gameSessionId: gameSession.id,
      name: 'New Scene',
      order,
      mapLocation
    };

    // If grid dimensions are provided, set Fixed Count mode
    if (gridWidth !== undefined && gridHeight !== undefined) {
      sceneData.gridMode = GridMode.MapDefined;
      sceneData.gridMapDefinedX = gridWidth;
      sceneData.gridMapDefinedY = gridHeight;
    }

    await handleMutation({
      mutation: () =>
        $createNewScene.mutateAsync({
          partyId: party.id,
          sceneData
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        createSceneErrors = error;
        devLog('scene', 'Error creating scene:', error);
      },
      onSuccess: (response) => {
        if (partyData && response?.scene) {
          const newScene = response.scene;
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
          devWarn(
            'scene',
            'Cannot add scene to Y.js - partyData not available or response missing scene:',
            !!partyData,
            !!response?.scene
          );
        }
        isNewSceneAdded = true;
        file = null;

        // Navigate to the newly created scene
        if (response?.scene) {
          goto(`/${party.slug}/${gameSession.slug}/${response.scene.order}`);
        }

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
        if (partyData) {
          partyData.updatePartyState('activeSceneId', sceneId);
        }
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
          devWarn(
            'scene',
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
          devWarn(
            'scene',
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

  // Handle scene reordering
  async function handleReorderScenes(fromId: string, toId: string) {
    const draggedItem = parseInt(fromId);
    const dragOverItem = parseInt(toId);

    if (draggedItem === dragOverItem) return;

    // Set the flag to prevent context menu from opening
    justFinishedDragging = true;

    // Reset the flag after a short delay
    setTimeout(() => {
      justFinishedDragging = false;
    }, 300); // Short delay to ensure context menu event is blocked

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
        onSuccess: (response) => {
          // Update local state with server-confirmed order
          if (response?.scenes) {
            // Sort by order to ensure correct display
            orderedScenes = [...response.scenes].sort((a, b) => a.order - b.order);

            // Update scene order in Y.js with server response
            if (partyData) {
              partyData.reorderScenes(
                response.scenes.map((scene) => ({
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
          }
        },
        toastMessages: {
          success: { title: 'Scenes reordered' },
          error: { title: 'Error reordering scenes', body: (error) => error.message || 'Error reordering scenes' }
        }
      });

      // Y.js handles sync automatically - no need for invalidateAll()
    } catch (error) {
      // On failure, revert to original order
      devError('scene', 'Error updating scene order:', error);
      // Revert the visual order
      orderedScenes = [...scenes];
      // Y.js will automatically revert if the server operation failed
    } finally {
      formIsLoading = false;
      // Reset the flag after a small delay to ensure navigation effect has run
      setTimeout(() => {
        isLocallyReordering = false;
      }, 500);
    }
  }

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
      // Extract grid dimensions from filename if present
      const dimensions = extractDimensionsFromFilename(file[0].name);
      handleCreateScene(scenes.length + 1, dimensions.width, dimensions.height);
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

  // Keep orderedScenes in sync with scenes prop, but not during drag operations
  $effect(() => {
    // Skip updating if we're currently dragging or have just finished dragging
    if (dragAndDrop.isDragging || dragAndDrop.draggedItem !== null || justFinishedDragging) {
      return;
    }

    // Skip updating if we're in the middle of a form operation (loading)
    if (formIsLoading) {
      return;
    }

    // Ensure scenes is a valid array before updating
    if (Array.isArray(scenes) && scenes.length > 0) {
      orderedScenes = [...scenes];
    } else if (!orderedScenes.length) {
      // Only set to empty array if orderedScenes is not already populated
      orderedScenes = [];
    }
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
              accept="image/*,video/*,.gif,.mp4,.webm,.mov,.avi"
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
        in:fly={{ x: -50, duration: 150, delay: isNewSceneAdded ? 0 : Math.min(index * 50, 500), easing: sineOut }}
        role="presentation"
        id={`scene-${scene.order}`}
        class={[
          'scene',
          scene.order === selectedSceneNumber && 'scene--isSelected',
          sceneBeingDeleted === scene.id && 'scene--isLoading',
          dragAndDrop.isDragging && dragAndDrop.draggedItem === index.toString() && 'scene--dragging',
          dragAndDrop.isDragging && dragAndDrop.draggedOverItem === index.toString() && 'scene--dropTarget',
          isDragDisabled(scene.id) && 'scene--no-drag'
        ]}
        style:background-image={scene.mapThumbLocation
          ? `url('${generateSmallThumbnailUrl(scene.mapThumbLocation)}')`
          : scene.mapLocation && !isVideoFile(scene.mapLocation)
            ? `url('${generateSmallThumbnailUrl(scene.mapLocation)}')`
            : `url('https://files.tableslayer.com/illustrations/party/empty.png')`}
        oncontextmenu={(event) => handleContextMenu(event, scene.id)}
        data-drag-id={index.toString()}
        draggable={!isDragDisabled(scene.id)}
        ondragstart={(e) =>
          dragAndDrop.handleDragStart(e, index.toString(), {
            transition: 'none',
            zIndex: '10'
          })}
        ondragover={(e) => dragAndDrop.handleDragOver(e, index.toString())}
        ondragleave={(e) => {
          // Only clear the drag over state if we're leaving to a different scene or outside
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          if (relatedTarget) {
            const targetScene = relatedTarget.closest('.scene');
            const currentScene = e.currentTarget as HTMLElement;
            // Only call handleDragLeave if we're moving to a different scene or outside
            if (targetScene !== currentScene) {
              dragAndDrop.handleDragLeave();
            }
          } else {
            dragAndDrop.handleDragLeave();
          }
        }}
        ondrop={(e) => dragAndDrop.handleDrop(e, index.toString())}
        ondragend={dragAndDrop.handleDragEnd}
        ontouchstart={(e) => dragAndDrop.handleTouchStart(e, index.toString(), e.currentTarget)}
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
          draggable="false"
          onclick={(e) => {
            // Only navigate if we're not dragging (prevent link activation during drag)
            if (dragAndDrop.isDragging) {
              e.preventDefault();
            }
          }}
          ondragover={(e) => e.preventDefault()}
          ondrop={(e) => e.preventDefault()}
        >
          {#if activeSceneId && activeSceneId === scene.id}
            <div class="scene__projectedIcon">
              {#if !party.gameSessionIsPaused}
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
    cursor: pointer;
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
