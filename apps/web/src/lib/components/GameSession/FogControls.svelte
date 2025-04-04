<script lang="ts">
  import {
    ColorPicker,
    type StageProps,
    type ColorUpdatePayload,
    Button,
    type StageExports,
    Spacer
  } from '@tableslayer/ui';
  import { generateGradientColors, to8CharHex, queuePropertyUpdate } from '$lib/utils';
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

  let fogHex = $state(to8CharHex(stageProps.fogOfWar.noise.baseColor, stageProps.fogOfWar.opacity));

  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    const fogColor = chroma(cd.hex).hex('rgb');
    const fogColors = generateGradientColors(fogColor);

    // Update each property individually
    queuePropertyUpdate(stageProps, ['fogOfWar', 'opacity'], cd.rgba.a, 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'baseColor'], fogColors[0], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor1'], fogColors[1], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor2'], fogColors[2], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor3'], fogColors[3], 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'noise', 'fogColor4'], fogColors[4], 'control');
  };

  $effect(() => {
    fogHex = to8CharHex(stageProps.fogOfWar.noise.baseColor, stageProps.fogOfWar.opacity);
  });
</script>

<ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} />

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
    <Spacer size={2} />
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
    <Spacer size={2} />
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
