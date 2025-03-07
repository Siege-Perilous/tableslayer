<script lang="ts">
  import { List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { ToneMappingMode } from 'postprocessing';
  import type { StageProps } from '@tableslayer/ui';

  let { props = $bindable() } = $props<{ props: StageProps }>();

  const lutOptions: ListOptions<string> = {
    Cool: 'https://files.tableslayer.com/stage/luts/Cool.cube',
    Grayscale: 'https://files.tableslayer.com/stage/luts/Grayscale.cube',
    Plum: 'https://files.tableslayer.com/stage/luts/Plum.cube',
    Spooky: 'https://files.tableslayer.com/stage/luts/Spooky.cube',
    Vibrant: 'https://files.tableslayer.com/stage/luts/Vibrant.cube',
    Warm: 'https://files.tableslayer.com/stage/luts/Warm.cube'
  };
</script>

<Folder title="Post Processing" expanded={false}>
  <List bind:value={props.postProcessing.enabled} label="Enabled" options={{ Yes: true, No: false }} />

  <Folder title="Bloom" expanded={false}>
    <List bind:value={props.postProcessing.bloom.enabled} label="Enabled" options={{ Yes: true, No: false }} />
    <List bind:value={props.postProcessing.bloom.mipmapBlur} label="Mipmap Blur" options={{ Yes: true, No: false }} />
    <Slider bind:value={props.postProcessing.bloom.intensity} label="Intensity" min={0} max={10} />
    <Slider bind:value={props.postProcessing.bloom.radius} label="Radius" min={0} max={0.5} />
    <Slider bind:value={props.postProcessing.bloom.levels} label="Levels" min={1} max={16} step={1} />
    <Slider bind:value={props.postProcessing.bloom.threshold} label="Threshold" min={0} max={1} />
    <Slider bind:value={props.postProcessing.bloom.smoothing} label="Smoothing" min={0} max={1} />
  </Folder>

  <Folder title="Chromatic Aberration" expanded={false}>
    <List
      bind:value={props.postProcessing.chromaticAberration.enabled}
      label="Enabled"
      options={{ Yes: true, No: false }}
    />
    <Slider bind:value={props.postProcessing.chromaticAberration.offset} label="Offset" min={0} max={0.01} />
  </Folder>

  <Folder title="LUT" expanded={false}>
    <List bind:value={props.postProcessing.lut.enabled} label="Enabled" options={{ Yes: true, No: false }} />
    <List bind:value={props.postProcessing.lut.url} label="LUT" options={lutOptions} />
  </Folder>

  <Folder title="Tone Mapping" expanded={false}>
    <List bind:value={props.postProcessing.toneMapping.enabled} label="Enabled" options={{ Yes: true, No: false }} />
    <List
      bind:value={props.postProcessing.toneMapping.mode}
      label="Mode"
      options={{
        ACES_FILMIC: ToneMappingMode.ACES_FILMIC,
        AGX: ToneMappingMode.AGX,
        CINEON: ToneMappingMode.CINEON,
        LINEAR: ToneMappingMode.LINEAR,
        NEUTRAL: ToneMappingMode.NEUTRAL,
        OPTIMIZED_CINEON: ToneMappingMode.OPTIMIZED_CINEON,
        REINHARD: ToneMappingMode.REINHARD,
        REINHARD2: ToneMappingMode.REINHARD2,
        REINHARD2_ADAPTIVE: ToneMappingMode.REINHARD2_ADAPTIVE,
        UNCHARTED2: ToneMappingMode.UNCHARTED2
      }}
    />
  </Folder>

  <Folder title="Vignette" expanded={false}>
    <List bind:value={props.postProcessing.vignette.enabled} label="Enabled" options={{ Yes: true, No: false }} />
    <Slider bind:value={props.postProcessing.vignette.offset} label="Offset" min={0} max={1} step={0.1} />
    <Slider bind:value={props.postProcessing.vignette.darkness} label="Darkness" min={0} max={1} step={0.1} />
  </Folder>
</Folder>
