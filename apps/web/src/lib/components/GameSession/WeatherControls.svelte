<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { IconSnowflake, IconDroplet, IconSun, IconLeaf, IconFlame } from '@tabler/icons-svelte';
  import { Icon, FormControl, Spacer, type StageProps, Input, IconButton } from '@tableslayer/ui';

  let {
    socketUpdate,
    stageProps = $bindable(),
    errors
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
  } = $props();

  // Weather toggle
  const handleWeatherTypeChange = (weatherType: number) => {
    console.log('weather type change', weatherType);
    stageProps.weather.type = weatherType;
    socketUpdate();
  };
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
      <IconButton {...inputProps} variant="ghost" onclick={() => handleWeatherTypeChange(3)}>
        <Icon Icon={IconLeaf} size="20px" stroke={2} />
      </IconButton>
      <IconButton {...inputProps} variant="ghost" onclick={() => handleWeatherTypeChange(4)}>
        <Icon Icon={IconFlame} size="20px" stroke={2} />
      </IconButton>
    {/snippet}
  </FormControl>
</div>
<Spacer />
<div class="weatherControls">
  <FormControl label="FOV" name="fov" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={10} step={120} bind:value={stageProps.weather.fov} />
    {/snippet}
  </FormControl>
  <FormControl label="Opacity" name="opacity" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} step={1} bind:value={stageProps.weather.opacity} />
    {/snippet}
  </FormControl>
  <FormControl label="Intensity" name="weatherIntensity" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} step={1} bind:value={stageProps.weather.intensity} />
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
