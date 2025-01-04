<script lang="ts">
  import SuperDebug, { fileProxy } from 'sveltekit-superforms';
  import { Button, FSControl, FileInput, Icon, Spacer, MessageError, ContextMenu, addToast } from '@tableslayer/ui';
  import { IconPlus, IconScreenShare } from '@tabler/icons-svelte';
  import type { SelectScene } from '$lib/db/gs/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import { hasThumb } from '$lib/utils';
  import {
    createSceneSchema,
    deleteSceneSchema,
    type CreateSceneFormType,
    type DeleteSceneFormType,
    type SetActiveSceneFormType
  } from '$lib/schemas';
  import type { SuperValidated } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import type { SelectGameSession } from '$lib/db/app/schema';
  import { Field } from 'formsnap';
  import { type Thumb } from '$lib/server';
  import classNames from 'classnames';

  let {
    scenes,
    createSceneForm,
    gameSession,
    selectedSceneNumber,
    deleteSceneForm,
    setActiveSceneForm,
    activeScene,
    party
  }: {
    scenes: (SelectScene | (SelectScene & Thumb))[];
    createSceneForm: SuperValidated<CreateSceneFormType>;
    deleteSceneForm: SuperValidated<DeleteSceneFormType>;
    setActiveSceneForm: SuperValidated<SetActiveSceneFormType>;
    gameSession: SelectGameSession;
    selectedSceneNumber: number;
    party: SelectParty & Thumb;
    activeScene: SelectScene | (SelectScene & Thumb) | null;
  } = $props();

  const createSceneSuperForm = superForm(createSceneForm, {
    validators: zodClient(createSceneSchema),
    resetForm: true,
    invalidateAll: 'force',
    delayMs: 50,
    onResult: (result) => {
      if (result) {
        console.log('scene createed', result, $createSceneData);
        createSceneReset();
      }
    }
  });

  const deleteSceneSuperForm = superForm(deleteSceneForm, {
    resetForm: true,
    validators: zodClient(deleteSceneSchema),
    invalidateAll: 'force',
    delayMs: 500
  });

  const setActiveSceneSuperForm = superForm(setActiveSceneForm, {
    resetForm: true,
    validators: zodClient(deleteSceneSchema),
    invalidateAll: 'force',
    delayMs: 500
  });

  const {
    form: createSceneData,
    enhance: createSceneEnhance,
    message: createSceneMessage,
    formId: createSceneFormId,
    reset: createSceneReset,
    delayed: createSceneDelayed
  } = createSceneSuperForm;

  const {
    form: setActiveSceneData,
    enhance: setActiveSceneEnhance,
    message: setActiveSceneMessage,
    formId: setActiveSceneFormId
  } = setActiveSceneSuperForm;

  const {
    form: deleteSceneData,
    enhance: deleteSceneEnhance,
    message: deleteSceneMessage,
    formId: deleteSceneFormId,
    delayed: deleteSceneDelayed
  } = deleteSceneSuperForm;

  $effect(() => {
    $createSceneFormId = new Date().getTime().toString();
    $createSceneData.name = 'test';
    $createSceneData.dbName = gameSession.dbName;
    $createSceneData.order = scenes.length + 1;
  });

  let file = $state(fileProxy(createSceneData, 'file'));

  const onCreateScene = (order: number) => {
    $createSceneData.dbName = gameSession.dbName;
    $createSceneData.name = 'test';
    $createSceneFormId = `createScene-${order}`;
    $createSceneData.order = order;
    setTimeout(() => createSceneSuperForm.submit(), 50);
  };

  const setActiveScene = (sceneId: string) => {
    console.log('setActiveScene', sceneId);
    $setActiveSceneFormId = sceneId;
    $setActiveSceneData.sceneId = sceneId;
    $setActiveSceneData.dbName = gameSession.dbName;
    setTimeout(() => setActiveSceneSuperForm.submit(), 50);
  };

  const onDeleteScene = (sceneId: string) => {
    $deleteSceneFormId = sceneId;
    $deleteSceneData.sceneId = sceneId;
    $deleteSceneData.dbName = gameSession.dbName;
    setTimeout(() => deleteSceneSuperForm.submit(), 50);
  };

  const sceneInputClasses = classNames('scene', $createSceneDelayed && 'scene--isLoading');

  $effect(() => {
    if ($createSceneDelayed) {
      addToast({
        data: {
          title: 'Building scene',
          type: 'loading'
        }
      });
    }
  });
</script>

<div class="scenes">
  <div class="scene__input">
    <form method="post" enctype="multipart/form-data" action="?/createScene" use:createSceneEnhance>
      <input type="hidden" name="dbName" bind:value={$createSceneData.dbName} />
      <input type="hidden" name="order" bind:value={$createSceneData.order} />
      <input type="hidden" name="name" bind:value={$createSceneData.name} />
      <div class={sceneInputClasses}>
        <Field form={createSceneSuperForm} name="file">
          <FSControl>
            {#snippet content({ props })}
              <FileInput variant="dropzone" {...props} type="file" accept="image/png, image/jpeg" bind:files={$file} />
            {/snippet}
          </FSControl>
        </Field>
      </div>
      {#if $createSceneMessage}
        <Spacer />
        <MessageError message={$createSceneMessage} />
      {/if}
      <Spacer />
      <Button type="submit" variant="ghost" class="scene__inputBtn">
        {#snippet start()}
          <Icon Icon={IconPlus} />
        {/snippet}
        Add new scene
      </Button>
    </form>
    <SuperDebug data={$createSceneData} display={false} />
    <form method="post" action="?/setActiveScene" use:setActiveSceneEnhance>
      <input type="hidden" name="dbName" bind:value={$setActiveSceneData.dbName} />
      <input type="hidden" name="sceneId" bind:value={$setActiveSceneData.sceneId} />
      {#if $setActiveSceneMessage}
        <MessageError message={$setActiveSceneMessage} />
      {/if}
    </form>
  </div>
  <div class="scene__list">
    {#each scenes as scene}
      {@const sceneSelectorClasses = classNames(
        'scene',
        scene.order === selectedSceneNumber && 'scene--isSelected',
        $deleteSceneDelayed && $deleteSceneFormId === scene.id && 'scene--isLoading'
      )}
      <ContextMenu
        items={[
          { label: 'New scene', onclick: () => onCreateScene(scene.order + 1) },
          {
            label: 'Delete',
            onclick: () => {
              onDeleteScene(scene.id);
            }
          },
          { label: 'Duplicate scene', onclick: () => console.log('add') },
          { label: 'Set active scene', onclick: () => setActiveScene(scene.id) }
        ]}
      >
        {#snippet trigger()}
          <a
            href={`/${party.slug}/${gameSession.slug}/${scene.order}`}
            id={`scene-${scene.order}`}
            class={sceneSelectorClasses}
            style:background-image={hasThumb(scene) ? `url('${scene.thumb.resizedUrl}')` : 'inherit'}
          >
            {#if activeScene && activeScene.id === scene.id}
              <div class="scene__projectedIcon">
                Active
                <Icon Icon={IconScreenShare} size="1.25rem" stroke={2} />
              </div>
            {/if}
            <div class="scene__text">{scene.order} - {scene.name}</div>
          </a>
        {/snippet}
      </ContextMenu>
    {/each}
  </div>
  <form method="post" action="?/deleteScene" use:deleteSceneEnhance>
    <input type="hidden" name="dbName" bind:value={$deleteSceneData.dbName} />
    <input type="hidden" name="sceneId" bind:value={$deleteSceneData.sceneId} />
  </form>
  {#if $deleteSceneMessage}
    <Spacer />
    <MessageError message={$deleteSceneMessage} />
  {/if}
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
    cursor: pointer;
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
