<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { Spacer, DualInputSlider, type StageProps, FormControl, InputSlider, Icon, Text } from '@tableslayer/ui';
  import { IconX } from '@tabler/icons-svelte';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { PartyPlanSelector } from '../party';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
    stageProps,
    errors,
    party
  }: {
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
    party: SelectParty & Thumb;
  } = $props();

  const EDGE_TEXTURES = [
    'https://files.tableslayer.com/edgetextures/clouds-01.webp',
    'https://files.tableslayer.com/edgetextures/forrest-01.webp',
    'https://files.tableslayer.com/edgetextures/ice-01.webp',
    'https://files.tableslayer.com/edgetextures/ice-02.webp',
    'https://files.tableslayer.com/edgetextures/stars-01.webp',
    'https://files.tableslayer.com/edgetextures/stars-02.webp',
    'https://files.tableslayer.com/edgetextures/stone-01.webp',
    'https://files.tableslayer.com/edgetextures/stone-02.webp'
  ];

  const handleEdgeUrlChange = (value: string) => {
    queuePropertyUpdate(stageProps, ['edgeOverlay', 'url'], value, 'control');
    queuePropertyUpdate(stageProps, ['edgeOverlay', 'enabled'], true, 'control');
  };

  const handleEdgeOff = () => {
    queuePropertyUpdate(stageProps, ['edgeOverlay', 'url'], null, 'control');
    queuePropertyUpdate(stageProps, ['edgeOverlay', 'enabled'], false, 'control');
  };

  // Local state for DualInputSlider that syncs with stageProps
  let localFadeStart = $state(stageProps.edgeOverlay.fadeStart);
  let localFadeEnd = $state(stageProps.edgeOverlay.fadeEnd);

  // Sync local state with stageProps changes
  $effect(() => {
    localFadeStart = stageProps.edgeOverlay.fadeStart;
    localFadeEnd = stageProps.edgeOverlay.fadeEnd;
  });

  // Update stageProps when local values change
  $effect(() => {
    if (localFadeStart !== stageProps.edgeOverlay.fadeStart) {
      queuePropertyUpdate(stageProps, ['edgeOverlay', 'fadeStart'], localFadeStart, 'control');
    }
    if (localFadeEnd !== stageProps.edgeOverlay.fadeEnd) {
      queuePropertyUpdate(stageProps, ['edgeOverlay', 'fadeEnd'], localFadeEnd, 'control');
    }
  });
</script>

{#if party.plan === 'free'}
  <div class="edgeControls">
    <Text weight={800}>You are on a free plan</Text>
    <Spacer size="0.5rem" />
    <Text size="0.875rem" color="var(--fgMuted)">
      Edge controls are only available on upgraded plans. They allow you to add stylistic borders and fades to your
      tabletop.
    </Text>
    <Spacer />
    <PartyPlanSelector {party} />
  </div>
{:else}
  <div class="edgeControls">
    <Spacer />
    <div class="edgeControls__grid">
      <FormControl label="Opacity" name="edgeOpacity" {errors}>
        {#snippet input({ inputProps })}
          <InputSlider
            variant="opacity"
            {...inputProps}
            min={0}
            max={1}
            step={0.01}
            value={stageProps.edgeOverlay.opacity}
            oninput={(value) => queuePropertyUpdate(stageProps, ['edgeOverlay', 'opacity'], value, 'control')}
          />
        {/snippet}
      </FormControl>
      <FormControl label="Scale" name="edgeScale" {errors}>
        {#snippet input({ inputProps })}
          <InputSlider
            variant="opacity"
            {...inputProps}
            min={1}
            max={50}
            step={1}
            value={stageProps.edgeOverlay.scale}
            oninput={(value) => queuePropertyUpdate(stageProps, ['edgeOverlay', 'scale'], value, 'control')}
          />
        {/snippet}
      </FormControl>
    </div>
    <Spacer />
    <FormControl label="Fade" name="edgeFade" {errors}>
      {#snippet input({ inputProps })}
        <DualInputSlider
          min={0.1}
          max={1}
          step={0.05}
          {...inputProps}
          bind:valueStart={localFadeStart}
          bind:valueEnd={localFadeEnd}
        />
      {/snippet}
    </FormControl>
    <Spacer />
    <div class="edgeTextures">
      <button
        onclick={handleEdgeOff}
        class={['edgeTextures__btn', stageProps.edgeOverlay.enabled === false && 'edgeTextures__btn--isActive']}
      >
        <Icon Icon={IconX} size="1.5rem" color="var(--fgMuted)" />
        <Text size="0.875rem">No edge</Text>
      </button>
      {#each EDGE_TEXTURES as edge}
        <button
          onclick={() => handleEdgeUrlChange(edge)}
          class={['edgeTextures__btn', edge === stageProps.edgeOverlay.url && 'edgeTextures__btn--isActive']}
          style={`background-image: url(${edge})`}
          aria-label="Edge texture"
        ></button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .edgeControls {
    width: 16rem;
  }
  .edgeTextures {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 1rem;
  }
  .edgeTextures__btn {
    position: relative;
    cursor: pointer;
    aspect-ratio: 1;
    background-size: contain;
    box-shadow: 1px 1px 16px 2px rgba(0, 0, 0, 0.76) inset;
    border-radius: 0.25rem;
    opacity: 0.5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .edgeTextures__btn--isActive,
  .edgeTextures__btn:hover {
    opacity: 1;
  }
  .edgeTextures__btn--isActive:before,
  .edgeTextures__btn:hover:before {
    position: absolute;
    content: '';
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border: 2px solid var(--fgPrimary);
    border-radius: 0.25rem;
  }
  :global {
    .edgeControls__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .edgeControls__fogLabel {
      height: 2rem;
      line-height: 2rem;
    }
  }
</style>
