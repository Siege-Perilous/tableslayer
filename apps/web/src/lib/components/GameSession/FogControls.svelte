<script lang="ts">
  import { ColorPicker, type StageProps, type ColorUpdatePayload } from '@tableslayer/ui';
  import { generateGradientColors, to8CharHex } from '$lib/utils';
  import chroma from 'chroma-js';

  let {
    socketUpdate,
    stageProps = $bindable()
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
  } = $props();

  let fogHex = $state(to8CharHex(stageProps.fogOfWar.noise.baseColor, stageProps.fogOfWar.opacity));

  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    const fogColor = chroma(cd.hex).hex('rgb');
    const fogColors = generateGradientColors(fogColor);
    stageProps.fogOfWar = {
      ...stageProps.fogOfWar,
      opacity: cd.rgba.a,
      noise: {
        ...stageProps.fogOfWar.noise,
        baseColor: fogColors[0],
        fogColor1: fogColors[1],
        fogColor2: fogColors[2],
        fogColor3: fogColors[3],
        fogColor4: fogColors[4]
      }
    };
    socketUpdate();
  };

  $effect(() => {
    fogHex = to8CharHex(stageProps.fogOfWar.noise.baseColor, stageProps.fogOfWar.opacity);
  });
</script>

<ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} />
