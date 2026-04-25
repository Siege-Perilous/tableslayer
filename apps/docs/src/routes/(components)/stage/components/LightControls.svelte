<script lang="ts">
  import { Color, Slider, Folder, Text, List, type ListOptions } from 'svelte-tweakpane-ui';
  import { type Light, type StageProps, LightStyle, LightPulse } from '@tableslayer/stage';

  let { props = $bindable(), selectedLight = $bindable() } = $props<{
    props: StageProps;
    selectedLight: Light | undefined;
  }>();

  const lightStyleOptions: ListOptions<LightStyle> = [
    { text: 'Torch', value: LightStyle.Torch },
    { text: 'Candle', value: LightStyle.Candle },
    { text: 'Magical', value: LightStyle.Magical },
    { text: 'Fire', value: LightStyle.Fire },
    { text: 'Lantern', value: LightStyle.Lantern },
    { text: 'Spotlight', value: LightStyle.Spotlight }
  ];

  const lightPulseOptions: ListOptions<LightPulse> = [
    { text: 'None', value: LightPulse.None },
    { text: 'Slow', value: LightPulse.Slow },
    { text: 'Medium', value: LightPulse.Medium },
    { text: 'Fast', value: LightPulse.Fast }
  ];
</script>

<Folder title="Light" expanded={false}>
  <List bind:value={props.light.visible} label="Visible" options={{ Yes: true, No: false }} />
  <List bind:value={props.light.snapToGrid} label="Snap to Grid" options={{ Yes: true, No: false }} />

  <Folder title="Lights" expanded={true}>
    {#each props.light.lights as light}
      <Folder title={light.style} expanded={false}>
        <Text bind:value={light.id} label="Id" disabled={true} />
        <List bind:value={light.style} label="Style" options={lightStyleOptions} />
        <Color bind:value={light.color} label="Color" />
        <Slider bind:value={light.radius} label="Radius" min={0.5} max={20} step={0.5} />
        <List bind:value={light.pulse} label="Pulse" options={lightPulseOptions} />
        <Slider bind:value={light.opacity} label="Opacity" min={0} max={1} step={0.1} />
      </Folder>
    {/each}
  </Folder>
</Folder>
