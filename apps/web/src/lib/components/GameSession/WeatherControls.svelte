<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { FormControl, Spacer, type StageProps, Input, Select } from '@tableslayer/ui';

  let {
    socketUpdate,
    stageProps = $bindable(),
    errors
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
  } = $props();

  const selectedWeather = $state(stageProps.weather.type.toString());

  // Weather toggle
  const handleWeatherTypeChange = (weatherType: string) => {
    console.log('weather type change', weatherType);
    stageProps.weather.type = Number(weatherType);
    socketUpdate();
  };

  const weatherTypes = [
    { label: 'None', value: '0' },
    { label: 'Rain', value: '1' },
    { label: 'Snow', value: '2' },
    { label: 'Leaves', value: '3' },
    { label: 'Embers', value: '4' }
  ];
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
  <FormControl label="FOV" name="fov" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={10} max={120} bind:value={stageProps.weather.fov} />
    {/snippet}
  </FormControl>
</div>
<Spacer />
<div class="weatherControls">
  <FormControl label="Opacity" name="opacity" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} max={1} bind:value={stageProps.weather.opacity} />
    {/snippet}
  </FormControl>
  <FormControl label="Intensity" name="weatherIntensity" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} max={1} bind:value={stageProps.weather.intensity} />
    {/snippet}
    {#snippet end()}
      in.
    {/snippet}
  </FormControl>
</div>
<Spacer />

<style>
  .weatherControls {
    width: 16rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
</style>
