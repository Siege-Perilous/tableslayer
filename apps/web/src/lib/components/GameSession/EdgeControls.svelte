<script lang="ts">
  import { type ZodIssue } from 'zod';
  import { Spacer, type StageProps, RadioButton, Label } from '@tableslayer/ui';

  let {
    socketUpdate,
    stageProps = $bindable(),
    errors
  }: {
    socketUpdate: () => void;
    stageProps: StageProps;
    errors: ZodIssue[] | undefined;
  } = $props();

  const weatherTypes = [
    { label: 'None', value: '0' },
    { label: 'Rain', value: '1' },
    { label: 'Snow', value: '2' },
    { label: 'Leaves', value: '3' },
    { label: 'Embers', value: '4' }
  ];
</script>

<div class="weatherControls__fog">
  <Label class="weatherControls__fogLabel">Edge texture</Label>
  <div>
    <RadioButton
      selected={stageProps.edgeOverlay.enabled ? 'true' : 'false'}
      options={[
        { label: 'on', value: 'true' },
        { label: 'off', value: 'false' }
      ]}
      onSelectedChange={(value) => {
        stageProps.edgeOverlay.enabled = value === 'true';
        socketUpdate();
      }}
    />
  </div>
</div>

{#if stageProps.edgeOverlay.enabled}
  <Spacer />
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
