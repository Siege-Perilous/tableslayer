<script lang="ts">
  import SuperDebug, { fileProxy } from 'sveltekit-superforms';
  import { Button, FSControl, FileInput, Icon, Spacer, MessageError, ContextMenu } from '@tableslayer/ui';
  import { IconPlus } from '@tabler/icons-svelte';
  import type { SelectScene } from '$lib/db/gs/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import {
    createSceneSchema,
    deleteSceneSchema,
    type CreateSceneFormType,
    type DeleteSceneFormType
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
    activeSceneNumber,
    deleteSceneForm,
    party
  }: {
    scenes: (SelectScene | (SelectScene & Thumb))[];
    createSceneForm: SuperValidated<CreateSceneFormType>;
    deleteSceneForm: SuperValidated<DeleteSceneFormType>;
    gameSession: SelectGameSession;
    activeSceneNumber: number;
    party: SelectParty & Thumb;
  } = $props();

  const createSceneSuperForm = superForm(createSceneForm, {
    validators: zodClient(createSceneSchema),
    resetForm: true,
    invalidateAll: 'force',
    delayMs: 500,
    onResult: (result) => {
      if (result) {
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

  const {
    form: createSceneData,
    enhance: createSceneEnhance,
    message: createSceneMessage,
    formId: createSceneFormId,
    reset: createSceneReset,
    delayed: createSceneDelayed
  } = createSceneSuperForm;
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

  const hasThumb = (scene: SelectScene | (SelectScene & Thumb)) => {
    return 'thumb' in scene;
  };

  const onCreateScene = (order: number) => {
    $createSceneData.dbName = gameSession.dbName;
    $createSceneData.name = 'test';
    $createSceneFormId = `createScene-${order}`;
    $createSceneData.order = order;
    setTimeout(() => createSceneSuperForm.submit(), 50);
  };

  const onDeleteScene = (sceneId: string) => {
    $deleteSceneFormId = sceneId;
    $deleteSceneData.sceneId = sceneId;
    $deleteSceneData.dbName = gameSession.dbName;
    setTimeout(() => deleteSceneSuperForm.submit(), 50);
  };
</script>

<div class="scenes">
  <div class="scene__input">
    <form method="post" enctype="multipart/form-data" action="?/createScene" use:createSceneEnhance>
      <input type="hidden" name="dbName" bind:value={$createSceneData.dbName} />
      <input type="hidden" name="order" bind:value={$createSceneData.order} />
      <input type="hidden" name="name" bind:value={$createSceneData.name} />
      {#if !$createSceneDelayed}
        <div class="scene">
          <Field form={createSceneSuperForm} name="file">
            <FSControl>
              {#snippet children({ attrs })}
                <FileInput
                  {...attrs}
                  variant="dropzone"
                  type="file"
                  accept="image/png, image/jpeg"
                  bind:files={$file}
                />
              {/snippet}
            </FSControl>
          </Field>
        </div>
        {#if $createSceneMessage}
          <Spacer />
          {$createSceneMessage.text}
          <MessageError message={$createSceneMessage} />
        {/if}
        <Spacer />
        <Button type="submit" variant="ghost" class="scene__inputBtn">
          {#snippet start()}
            <Icon Icon={IconPlus} />
          {/snippet}
          Add scene
        </Button>
      {/if}
    </form>
    <SuperDebug data={$createSceneData} display={false} />
  </div>
  <div class="scene__list">
    {#each scenes as scene}
      {@const sceneSelectorClasses = classNames(
        'scene',
        scene.order === activeSceneNumber && 'scene--isActive',
        $deleteSceneDelayed && $deleteSceneFormId === scene.id && 'scene--isLoading'
      )}
      {@const sceneSelectorSkelClasses = classNames(
        'scene',
        scene.order === activeSceneNumber && 'scene--isActive',
        $createSceneData.order === scene.order + 1 && 'scene--isLoading'
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
          { label: 'Make active scene', onclick: () => console.log('active') }
        ]}
      >
        {#snippet trigger()}
          <a
            href={`/${party.slug}/${gameSession.slug}/${scene.order}`}
            class={sceneSelectorClasses}
            style:background-image={hasThumb(scene) ? `url('${scene.thumb.resizedUrl}')` : 'inherit'}
          >
            <!--
          <div class="scene__projectedIcon">
            <Icon Icon={IconScreenShare} size="1.25rem" stroke={2} />
          </div>
          -->
            <div class="scene__text">{scene.order} - {scene.name}</div>
          </a>
        {/snippet}
      </ContextMenu>
      {#if $createSceneDelayed && $createSceneData.order === scene.order + 1}
        <div class={sceneSelectorSkelClasses}>
          <div class="scene__text">Creating</div>
        </div>
      {/if}
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
    overflow: hidden;
    background-size: 100%;
    box-shadow: 1px 1px 32px 4px rgba(0, 0, 0, 0.76) inset;
    cursor: pointer;
    display: block;
    background-color: var(--contrastLow);
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
  .scene:hover:not(.scene--isActive) {
    border-color: var(--primary-800);
  }
  .scene--isActive {
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
    width: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2);
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
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
