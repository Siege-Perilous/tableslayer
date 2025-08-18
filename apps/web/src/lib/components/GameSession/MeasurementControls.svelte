<script lang="ts">
  import {
    type StageProps,
    SelectorMenu,
    FormControl,
    Input,
    Hr,
    Spacer,
    MeasurementType,
    MapLayerType,
    Icon
  } from '@tableslayer/ui';
  import { IconLine, IconCone2, IconCircle, IconSquare, IconRectangleVertical } from '@tabler/icons-svelte';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectScene } from '$lib/db/app/schema';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
    stageProps,
    onSelectedChange
  }: {
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    onSelectedChange?: (value: string) => void;
  } = $props();

  const measurementOptions = [
    {
      label: 'Line',
      value: 'line',
      icon: IconLine,
      type: MeasurementType.Line
    },
    {
      label: 'Cone',
      value: 'cone',
      icon: IconCone2,
      type: MeasurementType.Cone
    },
    {
      label: 'Circle',
      value: 'circle',
      icon: IconCircle,
      type: MeasurementType.Circle
    },
    {
      label: 'Square',
      value: 'square',
      icon: IconSquare,
      type: MeasurementType.Square
    },
    {
      label: 'Beam',
      value: 'beam',
      icon: IconRectangleVertical,
      type: MeasurementType.Beam
    }
  ];

  let selectedMeasurement = $state(
    measurementOptions.find((option) => option.type === stageProps.measurement?.type) || measurementOptions[0]
  );

  $effect(() => {
    selectedMeasurement =
      measurementOptions.find((option) => option.type === stageProps.measurement?.type) || measurementOptions[0];
  });

  function handleMeasurementChange(value: string) {
    const option = measurementOptions.find((opt) => opt.value === value);
    if (option) {
      selectedMeasurement = option;
      queuePropertyUpdate(stageProps, ['measurement', 'type'], option.type, 'control');
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Measurement, 'control');
      onSelectedChange?.(value);
    }
  }

  function handleBeamWidthChange(value: number) {
    queuePropertyUpdate(stageProps, ['measurement', 'beamWidth'], value, 'control');
  }

  function handleConeAngleChange(value: number) {
    queuePropertyUpdate(stageProps, ['measurement', 'coneAngle'], value, 'control');
  }
</script>

<SelectorMenu
  selected={selectedMeasurement.value}
  options={measurementOptions}
  positioning={{ placement: 'bottom', offset: 8 }}
  onSelectedChange={handleMeasurementChange}
>
  {#snippet triggerContent()}
    <Icon Icon={selectedMeasurement.icon} size="1.5rem" />
  {/snippet}

  {#snippet footer()}
    <Spacer />
    <Hr />
    <div class="measurementControls__footer">
      <FormControl label="Beam width" name="beamWidth">
        {#snippet input(inputProps)}
          <Input
            {...inputProps}
            type="number"
            value={stageProps.measurement?.beamWidth ?? 5}
            oninput={(e) => handleBeamWidthChange(Number(e.currentTarget.value))}
            min={0.5}
            max={10}
            step={0.5}
          />
        {/snippet}
      </FormControl>
      <Spacer />
      <FormControl label="Cone angle" name="coneAngle">
        {#snippet input(inputProps)}
          <Input
            {...inputProps}
            type="number"
            value={stageProps.measurement?.coneAngle ?? 60}
            oninput={(e) => handleConeAngleChange(Number(e.currentTarget.value))}
            min={15}
            max={180}
            step={15}
          />
        {/snippet}
      </FormControl>
    </div>
  {/snippet}
</SelectorMenu>

<style>
  .measurementControls__footer {
    padding: 1rem 0.5rem 0.5rem 0.5rem;
  }
</style>
