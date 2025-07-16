<script lang="ts">
  import { List, Color, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { MeasurementType, type StageProps } from '@tableslayer/ui';

  const { props = $bindable() }: { props: StageProps } = $props();

  const measurementTypeOptions: ListOptions<number> = {
    Line: MeasurementType.Line,
    Beam: MeasurementType.Beam,
    Cone: MeasurementType.Cone,
    Circle: MeasurementType.Circle,
    Square: MeasurementType.Square
  };

  // Removed snapTypeOptions - using boolean instead
</script>

<Folder title="Measurement" expanded={false}>
  <List bind:value={props.measurement.type} label="Type" options={measurementTypeOptions} />
  <List bind:value={props.measurement.snapToGrid} label="Snap to Grid" options={{ true: true, false: false }} />
  <List bind:value={props.measurement.enableDMG252} label="DMG 252 Diagonals" options={{ true: true, false: false }} />
  <Slider bind:value={props.measurement.beamWidth} label="Beam Width" min={0.5} max={10} step={0.5} />
  <Slider bind:value={props.measurement.coneAngle} label="Cone Angle (degrees)" min={15} max={180} step={15} />
  <Slider bind:value={props.measurement.autoHideDelay} label="Auto Hide Delay (ms)" min={1000} max={10000} step={500} />
  <Color bind:value={props.measurement.color} label="Color" />
  <Color bind:value={props.measurement.outlineColor} label="Outline Color" />
  <Slider bind:value={props.measurement.thickness} label="Line Thickness" min={1} max={100} step={1} />
  <Slider bind:value={props.measurement.outlineThickness} label="Outline Thickness" min={1} max={100} step={1} />
  <Slider bind:value={props.measurement.markerSize} label="Marker Size" min={1} max={100} step={1} />
  <Slider bind:value={props.measurement.opacity} label="Opacity" min={0} max={1} step={0.01} />
  <List bind:value={props.measurement.showDistance} label="Show Distance" options={{ Yes: true, No: false }} />
</Folder>
