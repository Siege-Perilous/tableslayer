<script lang="ts">
  import { List, Color, Slider, Button, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { WeatherType, ParticleType } from '@tableslayer/ui';
  import { SnowPreset, RainPreset, LeavesPreset, AshPreset } from '@tableslayer/ui';
  import { KernelSize } from 'postprocessing';
  import type { StageProps } from '@tableslayer/ui';

  let { props = $bindable() } = $props<{ props: StageProps }>();

  const weatherTypeOptions: ListOptions<number> = {
    None: WeatherType.None,
    Rain: WeatherType.Rain,
    Snow: WeatherType.Snow,
    Leaves: WeatherType.Leaves,
    Ash: WeatherType.Ash,
    Custom: WeatherType.Custom
  };

  const particleTypeOptions: ListOptions<number> = {
    Ash: ParticleType.Ash,
    Leaves: ParticleType.Leaves,
    Rain: ParticleType.Rain,
    Snow: ParticleType.Snow
  };
</script>

<Folder title="Weather" expanded={false}>
  <List bind:value={props.weather.type} label="Type" options={weatherTypeOptions} />

  <Button
    title="Customize"
    on:click={() => {
      // Copy current preset data to custom
      let preset;
      switch (props.weather.type) {
        case WeatherType.Snow:
          preset = { ...SnowPreset };
          break;
        case WeatherType.Rain:
          preset = { ...RainPreset };
          break;
        case WeatherType.Leaves:
          preset = { ...LeavesPreset };
          break;
        case WeatherType.Ash:
          preset = { ...AshPreset };
          break;
        default:
          preset = { ...RainPreset };
      }
      props.weather.custom = preset;
      props.weather.type = WeatherType.Custom;
    }}
  />

  {#if props.weather.type === WeatherType.Custom && props.weather.custom}
    <Folder title="Custom" expanded={true}>
      <Slider bind:value={props.weather.custom.fov} label="FOV" min={10} max={120} step={1} />
      <Slider bind:value={props.weather.custom.intensity} label="Intensity" min={0} max={1} step={0.01} />
      <Slider bind:value={props.weather.custom.opacity} label="Opacity" min={0} max={1} step={0.01} />

      <Folder title="Depth of Field" expanded={false}>
        <List
          bind:value={props.weather.custom.depthOfField.enabled}
          label="Enabled"
          options={{ Yes: true, No: false }}
        />
        <Slider bind:value={props.weather.custom.depthOfField.focus} label="Focus" min={0} max={1} />
        <Slider bind:value={props.weather.custom.depthOfField.focalLength} label="Focal Length" min={0} max={10} />
        <Slider bind:value={props.weather.custom.depthOfField.bokehScale} label="Bokeh Scale" min={1} max={500} />
        <List
          bind:value={props.weather.custom.depthOfField.kernelSize}
          label="Kernel Size"
          options={{
            VERY_LARGE: KernelSize.VERY_LARGE,
            LARGE: KernelSize.LARGE,
            MEDIUM: KernelSize.MEDIUM,
            SMALL: KernelSize.SMALL,
            VERY_SMALL: KernelSize.VERY_SMALL
          }}
        />
      </Folder>

      <Folder title="Particles" expanded={false}>
        <List bind:value={props.weather.custom.particles.type} label="Type" options={particleTypeOptions} />
        <Slider
          bind:value={props.weather.custom.particles.maxParticleCount}
          label="Max ParticleCount"
          min={1}
          max={10000}
          step={1}
        />
        <Color bind:value={props.weather.custom.particles.color} label="Color" />
        <Slider bind:value={props.weather.custom.particles.lifetime} label="Lifetime" min={1} max={30} />

        <Slider
          bind:value={props.weather.custom.particles.fadeInTime}
          label="Fade In (s)"
          min={0}
          max={30}
          step={0.01}
        />
        <Slider
          bind:value={props.weather.custom.particles.fadeOutTime}
          label="Fade Out (s)"
          min={0}
          max={30}
          step={0.01}
        />

        <Folder title="Force" expanded={false}>
          <Folder title="Linear" expanded={false}>
            <Slider bind:value={props.weather.custom.particles.force.linear.x} label="Amplitude X" min={0} max={0.1} />
            <Slider bind:value={props.weather.custom.particles.force.linear.y} label="Amplitude Y" min={0} max={0.1} />
            <Slider bind:value={props.weather.custom.particles.force.linear.z} label="Amplitude Z" min={0} max={0.1} />
          </Folder>

          <Folder title="Exponential" expanded={false}>
            <Slider
              bind:value={props.weather.custom.particles.force.exponential.x}
              label="Amplitude X"
              min={0}
              max={0.1}
            />
            <Slider
              bind:value={props.weather.custom.particles.force.exponential.y}
              label="Amplitude Y"
              min={0}
              max={0.1}
            />
            <Slider
              bind:value={props.weather.custom.particles.force.exponential.z}
              label="Amplitude Z"
              min={0}
              max={0.1}
            />
          </Folder>

          <Folder title="Sinusoidal" expanded={false}>
            <Slider
              bind:value={props.weather.custom.particles.force.sinusoidal.amplitude.x}
              label="Amplitude X"
              min={0}
              max={0.05}
            />
            <Slider
              bind:value={props.weather.custom.particles.force.sinusoidal.amplitude.y}
              label="Amplitude Y"
              min={0}
              max={0.05}
            />
            <Slider
              bind:value={props.weather.custom.particles.force.sinusoidal.frequency.x}
              label="Frequency X"
              min={0}
              max={10}
            />
            <Slider
              bind:value={props.weather.custom.particles.force.sinusoidal.frequency.y}
              label="Frequency Y"
              min={0}
              max={10}
            />
          </Folder>
        </Folder>
      </Folder>
    </Folder>
  {/if}
</Folder>
