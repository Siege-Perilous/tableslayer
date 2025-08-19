<script lang="ts">
  import { type ZodIssue } from 'zod';
  import {
    FormControl,
    ColorPicker,
    InputSlider,
    Spacer,
    type StageProps,
    Select,
    type ColorUpdatePayload,
    Hr,
    RadioButton,
    Label
  } from '@tableslayer/ui';
  import { to8CharHex, queuePropertyUpdate } from '$lib/utils';
  import chroma from 'chroma-js';

  let {
    stageProps,
    errors
  }: {
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
  } = $props();

  let fogHex = $state(to8CharHex(stageProps.fog.color, stageProps.fog.opacity));

  const selectedWeather = $state(stageProps.weather.type.toString());

  // Weather toggle
  const handleWeatherTypeChange = (weatherType: string) => {
    queuePropertyUpdate(stageProps, ['weather', 'type'], Number(weatherType), 'control');
  };

  const weatherTypes = [
    { label: 'None', value: '0' },
    { label: 'Rain', value: '1' },
    { label: 'Snow', value: '2' },
    { label: 'Leaves', value: '3' },
    { label: 'Embers', value: '4' }
  ];

  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    queuePropertyUpdate(stageProps, ['fog', 'color'], chroma(cd.hex).hex('rgb'), 'control');
    queuePropertyUpdate(stageProps, ['fog', 'opacity'], cd.rgba.a, 'control');
  };
</script>

<div class="weatherControls">
  <FormControl label="Weather type" name="weatherType" {errors}>
    {#snippet input({ inputProps })}
      <Select
        selected={[selectedWeather]}
        onSelectedChange={(selected) => handleWeatherTypeChange(selected[0])}
        options={weatherTypes}
        {...inputProps}
      />
    {/snippet}
  </FormControl>
  <FormControl label="Field of view" name="weatherFov" {errors}>
    {#snippet input({ inputProps })}
      <InputSlider
        {...inputProps}
        min={10}
        max={120}
        step={1}
        value={stageProps.weather.fov}
        oninput={(value) => queuePropertyUpdate(stageProps, ['weather', 'fov'], value, 'control')}
      />
    {/snippet}
  </FormControl>
</div>
<Spacer />
<div class="weatherControls">
  <FormControl label="Opacity" name="opacity" {errors}>
    {#snippet input({ inputProps })}
      <InputSlider
        variant="opacity"
        {...inputProps}
        min={0}
        max={1}
        step={0.05}
        value={stageProps.weather.opacity}
        oninput={(value) => queuePropertyUpdate(stageProps, ['weather', 'opacity'], value, 'control')}
      />
    {/snippet}
  </FormControl>
  <FormControl label="Intensity" name="weatherIntensity" {errors}>
    {#snippet input({ inputProps })}
      <InputSlider
        variant="opacity"
        {...inputProps}
        min={0}
        max={1}
        step={0.05}
        value={stageProps.weather.intensity}
        oninput={(value) => queuePropertyUpdate(stageProps, ['weather', 'intensity'], value, 'control')}
      />
    {/snippet}
  </FormControl>
</div>
<Spacer size="0.5rem" />
<Hr />
<Spacer />
<div class="weatherControls__fog">
  <Label class="weatherControls__fogLabel">Ground fog</Label>
  <div>
    <RadioButton
      selected={stageProps.fog.enabled ? 'true' : 'false'}
      options={[
        { label: 'on', value: 'true' },
        { label: 'off', value: 'false' }
      ]}
      onSelectedChange={(value) => {
        queuePropertyUpdate(stageProps, ['fog', 'enabled'], value === 'true', 'control');
      }}
    />
  </div>
</div>

{#if stageProps.fog.enabled}
  <Spacer />
  <div class="WeatherControls">
    <FormControl label="Ground fog color" name="fogColor" {errors}>
      {#snippet input({ inputProps })}
        <ColorPicker {...inputProps} bind:hex={fogHex} onUpdate={handleFogColorUpdate} />
      {/snippet}
    </FormControl>
  </div>
{/if}

<style>
  .weatherControls {
    width: 16rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  :global {
    .weatherControls__fog {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .weatherControls__fogLabel {
      height: 2rem;
      line-height: 2rem;
    }
  }
</style>
