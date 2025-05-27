<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { FormControl, type StageProps, Select, Spacer, InputSlider, Text, Hr, RadioButton } from '@tableslayer/ui';
  import { queuePropertyUpdate } from '$lib/utils';
  import { ToneMappingMode } from 'postprocessing';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { PartyPlanSelector } from '../party';

  let {
    stageProps = $bindable(),
    errors,
    party
  }: {
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
    party: SelectParty & Thumb;
  } = $props();

  // LUTs licensed under CC BY-SA 4.0
  // https://gmic.eu/color_presets/
  const lutOptions = [
    { label: 'None', value: 'none' },
    { label: 'Bleach bypass', value: 'https://files.tableslayer.com/stage/luts/bleachbypass2.cube' },
    { label: 'Candlelight', value: 'https://files.tableslayer.com/stage/luts/candlelight.cube' },
    { label: 'Color negative', value: 'https://files.tableslayer.com/stage/luts/colornegative.cube' },
    { label: 'Cool', value: 'https://files.tableslayer.com/stage/luts/Cool.cube' },
    { label: 'Crisp warm', value: 'https://files.tableslayer.com/stage/luts/crispwarm.cube' },
    { label: 'Crisp winter', value: 'https://files.tableslayer.com/stage/luts/crispwinter.cube' },
    { label: 'Drop blues', value: 'https://files.tableslayer.com/stage/luts/dropblues.cube' },
    { label: 'Edgey ember', value: 'https://files.tableslayer.com/stage/luts/edgyember.cube' },
    { label: 'Fall colors', value: 'https://files.tableslayer.com/stage/luts/fallcolors.cube' },
    { label: 'Foggy night', value: 'https://files.tableslayer.com/stage/luts/foggynight.cube' },
    { label: 'Futuristic bleak', value: 'https://files.tableslayer.com/stage/luts/futuristicbleak2.cube' },
    { label: 'Grayscale', value: 'https://files.tableslayer.com/stage/luts/Grayscale.cube' },
    { label: 'Horror blue', value: 'https://files.tableslayer.com/stage/luts/horrorblue.cube' },
    { label: 'Late sunset', value: 'https://files.tableslayer.com/stage/luts/latesunset.cube' },
    { label: 'Moonlight', value: 'https://files.tableslayer.com/stage/luts/moonlight.cube' },
    { label: 'Night from day', value: 'https://files.tableslayer.com/stage/luts/nightfromday.cube' },
    { label: 'Smokey', value: 'https://files.tableslayer.com/stage/luts/smokey.cube' },
    { label: 'Spooky', value: 'https://files.tableslayer.com/stage/luts/Spooky.cube' },
    { label: 'Virbrant', value: 'https://files.tableslayer.com/stage/luts/Vibrant.cube' },
    { label: 'Warm', value: 'https://files.tableslayer.com/stage/luts/Warm.cube' }
  ];

  const toneMappingOptions = [
    { label: 'None (linear)', mode: ToneMappingMode.LINEAR, value: 'LINEAR' },
    { label: 'Neutral', mode: ToneMappingMode.NEUTRAL, value: 'NEUTRAL' },
    { label: 'Agx', mode: ToneMappingMode.AGX, value: 'AGX' },
    { label: 'Cineon', mode: ToneMappingMode.CINEON, value: 'CINEON' },
    { label: 'Reinhard', mode: ToneMappingMode.REINHARD, value: 'REINHARD' },
    { label: 'Reinhard 2', mode: ToneMappingMode.REINHARD2, value: 'REINHARD2' },
    { label: 'Reinhard Adaptive', mode: ToneMappingMode.REINHARD2_ADAPTIVE, value: 'REINHARD2_ADAPTIVE' },
    { label: 'Uncharted', mode: ToneMappingMode.UNCHARTED2, value: 'UNCHARTED2' }
  ];

  let selectedLut = $state(stageProps.postProcessing.lut.url !== null ? stageProps.postProcessing.lut.url : 'none');
  let selectedToneMapping = $state(
    toneMappingOptions.find((option) => option.mode === stageProps.postProcessing.toneMapping.mode)?.value ||
      toneMappingOptions[0].value
  );

  // Weather toggle
  const handleLutChange = (lutUrl: string) => {
    if (lutUrl === 'none') {
      queuePropertyUpdate(stageProps, ['postProcessing', 'lut', 'url'], null, 'control');
      return;
    }
    queuePropertyUpdate(stageProps, ['postProcessing', 'lut', 'url'], lutUrl, 'control');
    queuePropertyUpdate(stageProps, ['postProcessing', 'lut', 'enabled'], true, 'control');
  };

  const handleToneChange = (value: string) => {
    const toneMapping = toneMappingOptions.find((option) => option.value === value) || toneMappingOptions[0];
    queuePropertyUpdate(
      stageProps,
      ['postProcessing', 'toneMapping', 'mode'],
      toneMapping.mode as ToneMappingMode,
      'control'
    );
  };
</script>

{#if party.plan === 'free'}
  <div class="edgeControls">
    <Text weight={800}>You are on a free plan</Text>
    <Spacer size="0.5rem" />
    <Text size="0.875rem" color="var(--fgMuted)">
      Effects controls are only available on upgraded plans. They allow you to change the mood ("spooky", "vibrant",
      ...etc) for the entire scene.
    </Text>
    <Spacer />
    <PartyPlanSelector {party} />
  </div>
{:else}
  <Text weight={800} color="var(--fgMuted)">COLOR</Text>
  <Spacer size="0.5rem" />
  <div class="effectsControls">
    <FormControl label="Color grading" name="effectsLutUrl" {errors}>
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
          oninput={() =>
            queuePropertyUpdate(
              stageProps,
              ['postProcessing', 'chromaticAberration', 'offset'],
              stageProps.postProcessing.chromaticAberration.offset,
              'control'
            )}
        />
      {/snippet}
    </FormControl>
    <Spacer size="0.5rem" />
    <Hr />
    <Spacer size="1rem" />
    <Text weight={800} color="var(--fgMuted)">BLOOM</Text>
    <Spacer size="0.5rem" />
    <div class="effectsControls__grid">
      <FormControl label="Intensity" name="effectsBloomIntensity" {errors}>
        {#snippet input({ inputProps })}
          <InputSlider
            {...inputProps}
            min={0}
            max={10}
            step={0.05}
            bind:value={stageProps.postProcessing.bloom.intensity}
            oninput={() =>
              queuePropertyUpdate(
                stageProps,
                ['postProcessing', 'bloom', 'intensity'],
                stageProps.postProcessing.bloom.intensity,
                'control'
              )}
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
            oninput={() =>
              queuePropertyUpdate(
                stageProps,
                ['postProcessing', 'bloom', 'radius'],
                stageProps.postProcessing.bloom.radius,
                'control'
              )}
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
            oninput={() =>
              queuePropertyUpdate(
                stageProps,
                ['postProcessing', 'bloom', 'threshold'],
                stageProps.postProcessing.bloom.threshold,
                'control'
              )}
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
            oninput={() =>
              queuePropertyUpdate(
                stageProps,
                ['postProcessing', 'bloom', 'smoothing'],
                stageProps.postProcessing.bloom.smoothing,
                'control'
              )}
          />
        {/snippet}
      </FormControl>
    </div>
    <Spacer />
    <div class="effectsControls__grid">
      <FormControl label="Levels" name="effectsBloomLevels" {errors}>
        {#snippet input({ inputProps })}
          <InputSlider
            {...inputProps}
            min={0}
            max={16}
            step={1}
            bind:value={stageProps.postProcessing.bloom.levels}
            oninput={() =>
              queuePropertyUpdate(
                stageProps,
                ['postProcessing', 'bloom', 'levels'],
                stageProps.postProcessing.bloom.levels,
                'control'
              )}
          />
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
              queuePropertyUpdate(stageProps, ['postProcessing', 'bloom', 'mipmapBlur'], value === 'true', 'control');
            }}
          />
        {/snippet}
      </FormControl>
    </div>
  </div>
{/if}

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
