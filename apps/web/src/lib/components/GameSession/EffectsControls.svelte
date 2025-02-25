<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { FormControl, type StageProps, Select, Spacer, InputSlider, Text, Hr, RadioButton } from '@tableslayer/ui';
  import { ToneMappingMode } from 'postprocessing';

  let {
    socketUpdate,
    stageProps = $bindable(),
    errors
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
  } = $props();

  const lutOptions = [
    { label: 'None', value: '' },
    { label: 'Grayscale', value: 'http://files.tableslayer.com/stage/luts/Grayscale.cube' },
    { label: 'Spooky', value: 'http://files.tableslayer.com/stage/luts/Spooky.cube' },
    { label: 'Virbrant', value: 'http://files.tableslayer.com/stage/luts/Vibrant.cube' },
    { label: 'Warm', value: 'http://files.tableslayer.com/stage/luts/Warm.cube' },
    { label: 'Cool', value: 'http://files.tableslayer.com/stage/luts/Cool.cube' }
  ];

  const toneMappingOptions = [
    { label: 'Neutral', mode: ToneMappingMode.NEUTRAL, value: 'NEUTRAL' },
    { label: 'Agx', mode: ToneMappingMode.AGX, value: 'AGX' },
    { label: 'Cineon', mod: ToneMappingMode.CINEON, value: 'CINEON' },
    { label: 'Linear', mode: ToneMappingMode.LINEAR, value: 'LINEAR' },
    { label: 'Optimized cineon', mode: ToneMappingMode.OPTIMIZED_CINEON, value: 'OPTIMIZED_CINEON' },
    { label: 'Reinhard', mode: ToneMappingMode.REINHARD, value: 'REINHARD' },
    { label: 'Reinhard 2', mode: ToneMappingMode.REINHARD2, value: 'REINHARD2' },
    { label: 'Reinhard Adaptive', mode: ToneMappingMode.REINHARD2_ADAPTIVE, value: 'REINHARD2_ADAPTIVE' },
    { label: 'Uncharted', mode: ToneMappingMode.UNCHARTED2, value: 'UNCHARTED2' }
  ];

  const selectedLut = $state('');
  const selectedToneMapping = $state(
    toneMappingOptions.find((option) => option.mode === stageProps.postProcessing.toneMapping.mode)?.value ||
      toneMappingOptions[0].value
  );

  // Weather toggle
  const handleLutChange = (lutUrl: string) => {
    if (lutUrl === '') {
      stageProps.postProcessing.lut.url = 'http://files.tableslayer.com/stage/luts/Grayscale.cube';
      stageProps.postProcessing.lut.enabled = false;
      socketUpdate();
      return;
    }
    console.log('weather type change', lutUrl);
    stageProps.postProcessing.lut.url = lutUrl;
    stageProps.postProcessing.lut.enabled = true;
    socketUpdate();
  };

  const handleToneChange = (value: string) => {
    const toneMapping = toneMappingOptions.find((option) => option.value === value) || toneMappingOptions[0];
    stageProps.postProcessing.toneMapping.mode = toneMapping.mode as ToneMappingMode;
    socketUpdate();
  };
</script>

<div class="effectsControls">
  <FormControl label="Color profile" name="effectsLutUrl" {errors}>
    {#snippet input({ inputProps })}
      <Select
        selected={[selectedLut]}
        onSelectedChange={(selected) => handleLutChange(selected[0])}
        options={lutOptions}
        {...inputProps}
      />
    {/snippet}
  </FormControl>
  <Spacer />
  <FormControl label="Tone mapping" name="effectsToneMapping" {errors}>
    {#snippet input({ inputProps })}
      <Select
        selected={[selectedToneMapping]}
        onSelectedChange={(selected) => handleToneChange(selected[0])}
        options={toneMappingOptions}
        {...inputProps}
      />
    {/snippet}
  </FormControl>
  <Spacer />
  <FormControl label="Chromatic aberation" name="effectsChromaticAberration" {errors}>
    {#snippet input({ inputProps })}
      <InputSlider
        {...inputProps}
        min={0}
        max={0.02}
        step={0.001}
        bind:value={stageProps.postProcessing.chromaticAberration.offset}
      />
    {/snippet}
  </FormControl>
  <Spacer size={2} />
  <Hr />
  <Spacer size={2} />
  <Text weight={600} size="1.25rem" color="var(--fgMuted)">Bloom</Text>
  <Spacer size={4} />
  <div class="effectsControls__grid">
    <FormControl label="Intensity" name="effectsBloomIntensity" {errors}>
      {#snippet input({ inputProps })}
        <InputSlider
          {...inputProps}
          min={0}
          max={10}
          step={0.05}
          bind:value={stageProps.postProcessing.bloom.intensity}
        />
      {/snippet}
    </FormControl>
    <FormControl label="Radius" name="effectsBloomRadius" {errors}>
      {#snippet input({ inputProps })}
        <InputSlider
          {...inputProps}
          min={0}
          max={0.5}
          step={0.01}
          bind:value={stageProps.postProcessing.bloom.radius}
        />
      {/snippet}
    </FormControl>
  </div>
  <Spacer />
  <div class="effectsControls__grid">
    <FormControl label="Threshold" name="effectsBloomThreshold" {errors}>
      {#snippet input({ inputProps })}
        <InputSlider
          {...inputProps}
          min={0}
          max={1}
          step={0.01}
          bind:value={stageProps.postProcessing.bloom.threshold}
        />
      {/snippet}
    </FormControl>
    <FormControl label="Smoothing" name="effectsBloomSmoothing" {errors}>
      {#snippet input({ inputProps })}
        <InputSlider
          {...inputProps}
          min={0}
          max={1}
          step={0.01}
          bind:value={stageProps.postProcessing.bloom.smoothing}
        />
      {/snippet}
    </FormControl>
  </div>
  <Spacer />
  <div class="effectsControls__grid">
    <FormControl label="Levels" name="effectsBloomLevels" {errors}>
      {#snippet input({ inputProps })}
        <InputSlider {...inputProps} min={0} max={16} step={1} bind:value={stageProps.postProcessing.bloom.levels} />
      {/snippet}
    </FormControl>
    <FormControl label="Mip-map blur" name="effectsBloomBlur" {errors}>
      {#snippet input({ inputProps })}
        <RadioButton
          {...inputProps}
          selected={stageProps.postProcessing.bloom.mipmapBlur ? 'true' : 'false'}
          options={[
            { label: 'on', value: 'true' },
            { label: 'off', value: 'false' }
          ]}
          onSelectedChange={(value) => {
            stageProps.postProcessing.bloom.mipmapBlur = value === 'true';
            socketUpdate();
          }}
        />
      {/snippet}
    </FormControl>
  </div>
</div>

<style>
  .effectsControls {
    width: 16rem;
  }
  .effectsControls__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
</style>
