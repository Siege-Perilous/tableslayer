<script lang="ts">
  import { type ZodIssue } from 'zod';
  import {
    Spacer,
    DualInputSlider,
    type StageProps,
    RadioButton,
    Label,
    FormControl,
    InputSlider
  } from '@tableslayer/ui';

  let {
    socketUpdate,
    stageProps = $bindable(),
    errors
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
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
    stageProps.edgeOverlay.url = value;
    socketUpdate();
  };
</script>

<div class="edgeControls">
  <div class="edgeControls__grid">
    <Label class="edgeControls__fogLabel">Edge texture</Label>
    <div>
      <RadioButton
        selected={stageProps.edgeOverlay.enabled ? 'true' : 'false'}
        options={[
          { label: 'on', value: 'true' },
          { label: 'off', value: 'false' }
        ]}
        onSelectedChange={(value) => {
          stageProps.edgeOverlay.enabled = value === 'true';
          socketUpdate();
        }}
      />
    </div>
  </div>

  {#if stageProps.edgeOverlay.enabled}
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
            bind:value={stageProps.edgeOverlay.opacity}
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
            bind:value={stageProps.edgeOverlay.scale}
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
          bind:valueStart={stageProps.edgeOverlay.fadeStart}
          bind:valueEnd={stageProps.edgeOverlay.fadeEnd}
        />
      {/snippet}
    </FormControl>
    <Spacer />
    <div class="edgeTextures">
      {#each EDGE_TEXTURES as edge}
        <button
          onclick={() => handleEdgeUrlChange(edge)}
          class={['edgeTextures__btn', edge === stageProps.edgeOverlay.url && 'edgeTextures__btn--isActive']}
          style={`background-image: url(${edge})`}
          aria-label="Edge texture"
        >
        </button>
      {/each}
    </div>
  {/if}
</div>

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
