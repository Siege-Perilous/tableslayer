<script lang="ts">
  import {
    ColorPicker,
    type StageProps,
    type ColorUpdatePayload,
    Button,
    type StageExports,
    Spacer,
    InputSlider,
    FormControl
  } from '@tableslayer/ui';
  import { generateGradientColors, queuePropertyUpdate } from '$lib/utils';
  import chroma from 'chroma-js';

  let {
    socketUpdate,
    stage,
    stageProps = $bindable()
  }: {
    socketUpdate: () => void;
    stage: StageExports;
    stageProps: StageProps;
  } = $props();

  // Just use the base color hex without opacity for the color picker
  let fogHex = $state(stageProps.fogOfWar.noise.baseColor);

  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    const fogColor = chroma(cd.hex).hex('rgb');
    const fogColors = generateGradientColors(fogColor);

    // Only update colors, not opacity since we removed the opacity slider
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'baseColor'], fogColors[0], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor1'], fogColors[1], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor2'], fogColors[2], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor3'], fogColors[3], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor4'], fogColors[4], 'control');
  };

  const handleDmOpacityChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    // Update only the specific nested property
    queuePropertyUpdate(stageProps, ['fogOfWar', 'opacity', 'dm'], value, 'control');
  };

  const handlePlayerOpacityChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    // Update only the specific nested property
    queuePropertyUpdate(stageProps, ['fogOfWar', 'opacity', 'player'], value, 'control');
  };

  $effect(() => {
    fogHex = stageProps.fogOfWar.noise.baseColor;
  });
</script>

<ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} showOpacity={false} />

<Spacer />

<FormControl label="DM opacity" name="fogOfWarOpacityDm" errors={undefined}>
  {#snippet input({ inputProps })}
    <InputSlider
      {...inputProps}
      value={stageProps.fogOfWar.opacity.dm}
      oninput={handleDmOpacityChange}
      variant="opacity"
      hex={stageProps.fogOfWar.noise.baseColor}
      min={0}
      max={1}
      step={0.01}
    />
  {/snippet}
</FormControl>

<Spacer size="0.5rem" />

<FormControl label="Player opacity" name="fogOfWarOpacityPlayer" errors={undefined}>
  {#snippet input({ inputProps })}
    <InputSlider
      {...inputProps}
      value={stageProps.fogOfWar.opacity.player}
      oninput={handlePlayerOpacityChange}
      variant="opacity"
      hex={stageProps.fogOfWar.noise.baseColor}
      min={0}
      max={1}
      step={0.01}
    />
  {/snippet}
</FormControl>

<Spacer />

<div class="fogButtons">
  <div>
    <Button
      onclick={() => {
        stage.fogOfWar.clear();
        socketUpdate();
      }}
    >
      Clear fog
    </Button>
    <Spacer size="0.5rem" />
    <div class="fogButtons__key">F</div>
  </div>
  <div>
    <Button
      onclick={() => {
        stage.fogOfWar.reset();
        socketUpdate();
      }}
    >
      Reset fog
    </Button>
    <Spacer size="0.5rem" />
    <div class="fogButtons__key">Shift+F</div>
  </div>
</div>

<style>
  .fogButtons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  .fogButtons__key {
    font-size: 0.75rem;
    color: var(--fgMuted);
    text-align: center;
    font-family: var(--font-mono);
  }
</style>
