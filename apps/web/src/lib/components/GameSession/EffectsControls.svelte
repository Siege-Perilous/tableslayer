<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { FormControl, type StageProps, Select, Spacer } from '@tableslayer/ui';
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
    { label: 'Opt. cineon', mode: ToneMappingMode.OPTIMIZED_CINEON, value: 'OPTIMIZED_CINEON' },
    { label: 'Reinhard', mode: ToneMappingMode.REINHARD, value: 'REINHARD' },
    { label: 'Reinhard 2', mode: ToneMappingMode.REINHARD2, value: 'REINHARD2' },
    { label: 'Reinhard Apt.', mode: ToneMappingMode.REINHARD2_ADAPTIVE, value: 'REINHARD2_ADAPTIVE' },
    { label: 'Uncharted', mode: ToneMappingMode.UNCHARTED2, value: 'UNCHARTED2' }
  ];

  const selectedLut = $state(stageProps.postProcessing.lut.url || '');
  const selectedToneMapping = $state(
    toneMappingOptions.find((option) => option.mode === stageProps.postProcessing.toneMapping.mode)?.value ||
      toneMappingOptions[0].value
  );

  // Weather toggle
  const handleLutChange = (lutUrl: string) => {
    console.log('weather type change', lutUrl);
    stageProps.postProcessing.lut.url = lutUrl;
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
  <FormControl label="Tone" name="effectsToneMapping" {errors}>
    {#snippet input({ inputProps })}
      <Select
        selected={[selectedToneMapping]}
        onSelectedChange={(selected) => handleToneChange(selected[0])}
        options={toneMappingOptions}
        {...inputProps}
      />
    {/snippet}
  </FormControl>
</div>

<style>
  .effectsControls {
    width: 16rem;
  }
</style>
