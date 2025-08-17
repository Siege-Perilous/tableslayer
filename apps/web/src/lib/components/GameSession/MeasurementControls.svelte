<script lang="ts">
  import { type StageProps, Select, FormControl, Input, MeasurementType, MapLayerType } from '@tableslayer/ui';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectScene } from '$lib/db/app/schema';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
    stageProps,
    party,
    gameSession,
    selectedScene
  }: {
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
  } = $props();

  const measurementOptions = [
    { label: 'Line', value: String(MeasurementType.Line) },
    { label: 'Cone', value: String(MeasurementType.Cone) },
    { label: 'Circle', value: String(MeasurementType.Circle) },
    { label: 'Square', value: String(MeasurementType.Square) },
    { label: 'Beam', value: String(MeasurementType.Beam) }
  ];

  let selectedMeasurementType = $state(String(stageProps.measurement?.type ?? MeasurementType.Line));

  function handleMeasurementTypeChange(value: string) {
    selectedMeasurementType = value;
    queuePropertyUpdate(stageProps, ['measurement', 'type'], Number(value), 'control');
    // Activate measurement layer when type is selected
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Measurement, 'control');
  }

  function handleBeamWidthChange(value: string) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      queuePropertyUpdate(stageProps, ['measurement', 'beamWidth'], numValue, 'control');
    }
  }

  function handleConeAngleChange(value: string) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      queuePropertyUpdate(stageProps, ['measurement', 'coneAngle'], numValue, 'control');
    }
  }
</script>

<div class="measurementControls">
  <FormControl label="Measurement Type" name="measurementType">
    {#snippet input(inputProps)}
      <Select
        {...inputProps}
        options={measurementOptions}
        selected={[selectedMeasurementType]}
        onSelectedChange={(selected) => handleMeasurementTypeChange(selected[0])}
      />
    {/snippet}
  </FormControl>

  {#if selectedMeasurementType === String(MeasurementType.Beam)}
    <FormControl label="Beam Width" name="beamWidth">
      {#snippet input(inputProps)}
        <Input
          {...inputProps}
          type="number"
          value={String(stageProps.measurement?.beamWidth ?? 5)}
          min="0.5"
          max="10"
          step="0.5"
          onchange={(e) => handleBeamWidthChange(e.currentTarget.value)}
        />
      {/snippet}
    </FormControl>
  {/if}

  {#if selectedMeasurementType === String(MeasurementType.Cone)}
    <FormControl label="Cone Angle" name="coneAngle">
      {#snippet input(inputProps)}
        <Input
          {...inputProps}
          type="number"
          value={String(stageProps.measurement?.coneAngle ?? 60)}
          min="15"
          max="180"
          step="15"
          onchange={(e) => handleConeAngleChange(e.currentTarget.value)}
        />
      {/snippet}
    </FormControl>
  {/if}
</div>

<style>
  .measurementControls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    min-width: 250px;
  }
</style>
