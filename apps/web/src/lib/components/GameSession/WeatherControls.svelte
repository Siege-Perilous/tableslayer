<script lang="ts">
  import { type ZodIssue } from 'zod';
  import chroma from 'chroma-js';
  import { IconSnowflake, IconDroplet, IconSun } from '@tabler/icons-svelte';
  import {
    Icon,
    ColorPicker,
    FormControl,
    Spacer,
    type StageProps,
    type ColorUpdatePayload,
    Input,
    IconButton
  } from '@tableslayer/ui';
  import { to8CharHex } from '$lib/utils';

  let {
    socketUpdate,
    stageProps = $bindable(),
    errors
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
  } = $props();

  /* Initial local state
   * The form UX does not match the StageProps / DB schema exactly.
   * This is on purpose to limit choice / make decisions easier.
   */
  let weatherHex = $state(to8CharHex(stageProps.weather.color, stageProps.weather.opacity));

  // Weather toggle
  const handleWeatherTypeChange = (weatherType: number) => {
    console.log('weather type change', weatherType);
    stageProps.weather.type = weatherType;
    socketUpdate();
  };

  const handleWeatherColorUpdate = (cd: ColorUpdatePayload) => {
    const weatherColor = chroma(cd.hex).hex('rgb');
    stageProps.weather = {
      ...stageProps.weather,
      color: weatherColor,
      opacity: cd.rgba.a
    };
    socketUpdate();
  };

  // Local state and conversion for weather color, tv size and padding
  $effect(() => {
    weatherHex = to8CharHex(stageProps.weather.color, stageProps.weather.opacity);
  });
</script>

<div class="weatherControls">
  <FormControl label="Weather type" name="weatherType" {errors}>
    {#snippet input({ inputProps })}
      <IconButton {...inputProps} variant="ghost" onclick={() => handleWeatherTypeChange(0)}>
        <Icon Icon={IconSun} size="20px" stroke={2} />
      </IconButton>
      <IconButton {...inputProps} variant="ghost" onclick={() => handleWeatherTypeChange(1)}>
        <Icon Icon={IconDroplet} size="20px" stroke={2} />
      </IconButton>
      <IconButton {...inputProps} variant="ghost" onclick={() => handleWeatherTypeChange(2)}>
        <Icon Icon={IconSnowflake} size="20px" stroke={2} />
      </IconButton>
    {/snippet}
  </FormControl>
</div>
<Spacer />
<div class="weatherControls">
  <FormControl label="Field of view" name="fov" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} step={1} bind:value={stageProps.weather.fov} />
    {/snippet}
  </FormControl>
  <FormControl label="Intensity" name="weatherIntensity" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} step={0.25} bind:value={stageProps.weather.intensity} />
    {/snippet}
    {#snippet end()}
      in.
    {/snippet}
  </FormControl>
</div>
<Spacer />
<FormControl label="Weather color" name="weatherColor" {errors}>
  {#snippet input({ inputProps })}
    <ColorPicker {...inputProps} bind:hex={weatherHex} onUpdate={handleWeatherColorUpdate} />
  {/snippet}
</FormControl>
<Spacer />

<style>
  .weatherControls {
    width: 16rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
</style>
