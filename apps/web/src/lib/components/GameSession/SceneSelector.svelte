<script lang="ts">
  import { goto } from '$app/navigation';
  import { navigating } from '$app/state';
  import { useDragAndDrop } from '$lib/composables/useDragAndDrop.svelte';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { useCreateSceneMutation, useUploadFileMutation } from '$lib/queries';
  import { orderBetween, sceneRowToSettings, type SessionDocClient } from '$lib/realtime';
  import type { Thumb } from '$lib/server';
  import { generateSmallThumbnailUrl, isVideoFile, trackChecklistItem } from '$lib/utils';
  import { devLog } from '$lib/utils/debug';
  import { extractDimensionsFromFilename } from '$lib/utils/gridDimensions';
  import { GridMode } from '@tableslayer/stage';
  import { Button, ColorMode, FileInput, FormControl, Icon, IconButton, Input, Popover } from '@tableslayer/ui';
  import {
    IconCheck,
    IconChevronDown,
    IconGripVertical,
    IconPhoto,
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconX
  } from '@tabler/icons-svelte';
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { sineOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { v4 as uuidv4 } from 'uuid';
  import { PartyUpgrade } from '../party';
  import { openFileDialog, UpdateMapImage } from './';

  // Minimal scene shape shared by doc entries and SSR rows
  type SceneListItem = {
    id: string;
    name: string;
    order: number;
    mapLocation: string | null;
    mapThumbLocation: string | null;
  };

  let {
    scenes,
    gameSession,
    selectedSceneId,
    activeSceneId,
    party,
    client,
    isStripeEnabled = true
  }: {
    scenes: SceneListItem[];
    gameSession: SelectGameSession;
    selectedSceneId: string;
    party: SelectParty & Thumb;
    activeSceneId: string | undefined;
    client: SessionDocClient | null;
    isStripeEnabled?: boolean;
  } = $props();

  let file = $state<FileList | null>(null);
  let formIsLoading = $state(false);
  let sceneBeingDeleted = $state('');
  let createSceneErrors = $state<FormMutationError | undefined>(undefined);
  let renamingScenes = $state<Record<string, string | null>>({});
  let renameInputRefs = $state<Record<string, HTMLInputElement | undefined>>({});
  let openScenePopover = $state<string | null>(null);
  let orderedScenes = $state<SceneListItem[]>([]);
  let needsToUpgrade = $derived(isStripeEnabled && party.plan === 'free' && orderedScenes.length >= 3);
  let isNewSceneAdded = $state(false);
  let justFinishedDragging = $state(false);

  const uploadFile = useUploadFileMutation();
  const createNewScene = useCreateSceneMutation();

  const isSceneBeingRenamed = (sceneId: string) => {
    return renamingScenes[sceneId] !== null && renamingScenes[sceneId] !== undefined;
  };

  // Focus and select rename input when it becomes available
  let focusedInputs = new Set<string>();
  $effect(() => {
    for (const sceneId of Object.keys(renameInputRefs)) {
      const input = renameInputRefs[sceneId];
      if (input && !focusedInputs.has(sceneId)) {
        focusedInputs.add(sceneId);
        input.focus();
        input.select();
      }
    }
    untrack(() => {
      for (const sceneId of focusedInputs) {
        if (!isSceneBeingRenamed(sceneId)) {
          focusedInputs.delete(sceneId);
          delete renameInputRefs[sceneId];
        }
      }
    });
  });

  const isDragDisabled = (sceneId: string) => {
    return formIsLoading || isSceneBeingRenamed(sceneId) || sceneBeingDeleted === sceneId;
  };

  const dragAndDrop = useDragAndDrop({
    onReorder: handleReorderScenes,
    getItemId: (index: number) => index.toString(),
    isDisabled: (itemId: string) => {
      const index = parseInt(itemId);
      const scene = orderedScenes[index];
      return scene ? isDragDisabled(scene.id) : false;
    }
  });

  $effect(() => {
    if (navigating.to || formIsLoading) {
      dragAndDrop.cleanupDragPreview();
    }
  });

  // Scene creation still goes through the API: the server computes map/grid
  // alignment from the uploaded image. The response row is then added to the
  // doc, which is the live source of truth from that point on.
  const handleCreateScene = async (order: number, gridWidth?: number, gridHeight?: number) => {
    formIsLoading = true;
    let mapLocation: string | undefined = undefined;

    if (file && file.length) {
      const uploadedFile = await handleMutation({
        mutation: () => uploadFile.mutateAsync({ file: file![0], folder: 'map' }),
        formLoadingState: (loading) => (formIsLoading = loading),
        toastMessages: {
          success: { title: 'File uploaded' },
          error: { title: 'Error uploading file', body: (error) => error.message }
        }
      });

      if (!uploadedFile) return;
      mapLocation = uploadedFile.location;
    }

    const sceneData: Record<string, unknown> = {
      gameSessionId: gameSession.id,
      name: 'New Scene',
      order,
      mapLocation
    };
    if (gridWidth !== undefined && gridHeight !== undefined) {
      sceneData.gridMode = GridMode.MapDefined;
      sceneData.gridMapDefinedX = gridWidth;
      sceneData.gridMapDefinedY = gridHeight;
    }

    await handleMutation({
      mutation: () => createNewScene.mutateAsync({ partyId: party.id, sceneData }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        createSceneErrors = error;
      },
      onSuccess: (response) => {
        if (client && response?.scene) {
          client.write.createScene(sceneRowToSettings(response.scene));
        }
        isNewSceneAdded = true;
        file = null;
        trackChecklistItem('add-scene');
        if (gridWidth !== undefined && gridHeight !== undefined) {
          trackChecklistItem('map-defined-grid');
        }
        if (response?.scene) {
          goto(`/${party.slug}/${gameSession.slug}/${response.scene.id}`);
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

  const handleSetActiveScene = (sceneId: string) => {
    client?.party.setActiveScene(sceneId);
    trackChecklistItem('change-scene');
  };

  const handleDeleteScene = (sceneId: string) => {
    if (!client) return;
    sceneBeingDeleted = sceneId;
    client.write.deleteScene(sceneId);
    if (activeSceneId === sceneId) {
      client.party.setActiveScene(null);
    }
    sceneBeingDeleted = '';
  };

  const handleRenameScene = (sceneId: string) => {
    const name = renamingScenes[sceneId];
    if (!name || !client) return;
    client.write.setSceneSettings(sceneId, { name });
    renamingScenes[sceneId] = null;
  };

  // Duplicate entirely in the doc: copies settings, markers, lights,
  // annotations, and masks with fresh ids. The server persists the new rows.
  const handleDuplicateScene = (sceneId: string) => {
    if (!client) return;
    const snapshot = client.scene(sceneId);
    if (!snapshot) return;

    const list = client.scenes();
    const index = list.findIndex((scene) => scene.id === sceneId);
    const order = orderBetween(list[index]?.order ?? null, list[index + 1]?.order ?? null);
    const newId = uuidv4();

    client.write.createScene(
      {
        ...snapshot.settings,
        id: newId,
        name: `${snapshot.settings.name} (copy)`,
        order,
        mapThumbLocation: null
      },
      {
        markers: snapshot.markers.map((marker) => ({ ...marker, id: uuidv4(), sceneId: newId })),
        lights: snapshot.lights.map((light) => ({ ...light, id: uuidv4(), sceneId: newId })),
        annotations: snapshot.annotations.map((annotation) => ({
          ...annotation,
          id: uuidv4(),
          sceneId: newId,
          mask: client.annotationMask(sceneId, annotation.id)
        })),
        fogMask: client.fogMask(sceneId)
      }
    );
    devLog('scene', `Duplicated scene ${sceneId} -> ${newId}`);
    goto(`/${party.slug}/${gameSession.slug}/${newId}`);
  };

  // Reorder = one fractional-order write on the dragged scene
  function handleReorderScenes(fromId: string, toId: string) {
    const draggedItem = parseInt(fromId);
    const dragOverItem = parseInt(toId);
    if (draggedItem === dragOverItem || !client) return;

    justFinishedDragging = true;
    setTimeout(() => {
      justFinishedDragging = false;
    }, 300);

    const updatedScenes = [...orderedScenes];
    const [removed] = updatedScenes.splice(draggedItem, 1);
    updatedScenes.splice(dragOverItem, 0, removed);
    orderedScenes = updatedScenes;

    const prev = updatedScenes[dragOverItem - 1]?.order ?? null;
    const next = updatedScenes[dragOverItem + 1]?.order ?? null;
    client.write.setSceneSettings(removed.id, { order: orderBetween(prev, next) });
  }

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    requestAnimationFrame(() => {
      openFileDialog();
    });
  };

  const handleFileChange = (event: Event) => {
    event.preventDefault();
    if (file && file.length) {
      const dimensions = extractDimensionsFromFilename(file[0].name);
      handleCreateScene(scenes.length + 1, dimensions.width, dimensions.height);
    }
  };

  const handleContextMenu = (event: MouseEvent, sceneId: string) => {
    if (justFinishedDragging) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
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
    if (dragAndDrop.isDragging || dragAndDrop.draggedItem !== null || justFinishedDragging) {
      return;
    }
    if (formIsLoading) {
      return;
    }
    if (Array.isArray(scenes) && scenes.length > 0) {
      orderedScenes = [...scenes];
    } else if (!orderedScenes.length) {
      orderedScenes = [];
    }
  });
</script>

<div class="scenes" id="scenes" data-testid="scenesContainer">
  <div class="scene__input" data-testid="sceneInput">
    {#if needsToUpgrade}
      <PartyUpgrade {party} limitText="Free plan limited to 3 scenes" />
    {:else}
      <FormControl name="file" errors={createSceneErrors && createSceneErrors.errors}>
        {#snippet input({ inputProps })}
          <Button
            class="scene__inputBtn"
            isLoading={formIsLoading}
            disabled={formIsLoading}
            data-testid="addSceneButton"
          >
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
  <div class="scene__list" data-testid="sceneList">
    {#each orderedScenes as scene, index (scene.id)}
      <div
        animate:flip={{ delay: 100, duration: 200, easing: sineOut }}
        in:fly={{ x: -50, duration: 150, delay: isNewSceneAdded ? 0 : Math.min(index * 50, 500), easing: sineOut }}
        role="presentation"
        id={`scene-${scene.id}`}
        data-testid="sceneItem"
        class={[
          'scene',
          scene.id === selectedSceneId && 'scene--isSelected',
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
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          if (relatedTarget) {
            const targetScene = relatedTarget.closest('.scene');
            const currentScene = e.currentTarget as HTMLElement;
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
              <div class="scene__renameInput" data-testid="sceneRenameInput">
                <Input
                  type="text"
                  name="name"
                  bind:value={renamingScenes[scene.id]}
                  bind:element={renameInputRefs[scene.id]}
                  hideAutocomplete
                />
                <div class="scene__renameActions">
                  <IconButton type="submit">
                    <Icon Icon={IconCheck} />
                  </IconButton>
                  <IconButton type="button" onclick={() => (renamingScenes[scene.id] = null)}>
                    <Icon Icon={IconX} />
                  </IconButton>
                </div>
              </div>
            </form>
          </div>
        {/if}
        <a
          href={`/${party.slug}/${gameSession.slug}/${scene.id}`}
          class="scene__link"
          draggable="false"
          onclick={(e) => {
            if (dragAndDrop.isDragging) {
              e.preventDefault();
            }
          }}
          ondragover={(e) => e.preventDefault()}
          ondrop={(e) => e.preventDefault()}
        >
          {#if activeSceneId && activeSceneId === scene.id}
            <div class="scene__projectedIcon" data-testid="sceneActiveIcon">
              {#if !party.gameSessionIsPaused}
                <Icon Icon={IconPlayerPlayFilled} color="var(--fgPrimary)" />
                Active on table
              {:else}
                <Icon Icon={IconPlayerPauseFilled} color="var(--fgPrimary)" />
                Paused on table
              {/if}
            </div>
          {/if}
          <div class="scene__text" data-testid="sceneText">
            {index + 1} - {scene.name}
          </div>
        </a>
        <div class="scene__dragHandle" class:scene__dragHandle--disabled={isDragDisabled(scene.id)}>
          <Icon Icon={IconGripVertical} size="1.25rem" class="scene__dragHandleIcon" />
        </div>
        <Popover
          triggerClass="scene__popoverBtn"
          triggerTestId="scenePopoverButton"
          isOpen={openScenePopover === scene.id}
          onIsOpenChange={(open) => {
            if (!open) openScenePopover = null;
          }}
          positioning={{ placement: 'bottom-end' }}
          portal="#scenes"
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
              data-testid="sceneMenuNewScene"
              onclick={() => {
                handleCreateScene(scene.order + 1);
                contentProps.close();
              }}
            >
              New scene
            </button>
            <button
              class="scene__menuItem"
              data-testid="sceneMenuRename"
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
              data-testid="sceneMenuDuplicate"
              onclick={() => {
                handleDuplicateScene(scene.id);
                contentProps.close();
              }}
            >
              Duplicate scene
            </button>
            <button
              class="scene__menuItem"
              data-testid="sceneMenuChangeImage"
              onclick={() => {
                handleMapImageChange(scene.id);
                contentProps.close();
              }}
            >
              Change map image
            </button>
            <button
              class="scene__menuItem"
              data-testid="sceneMenuDelete"
              onclick={() => {
                handleDeleteScene(scene.id);
                contentProps.close();
              }}
            >
              Delete scene
            </button>
            <button
              class="scene__menuItem"
              data-testid="sceneMenuSetActive"
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

  <UpdateMapImage sceneId={contextSceneId} {client} />
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
    padding: 1rem;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
  }
  .scene__renameInput {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 200px;
  }
  .scene__renameActions {
    display: flex;
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
