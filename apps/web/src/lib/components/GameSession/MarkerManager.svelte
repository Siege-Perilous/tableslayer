<script lang="ts">
  import {
    Title,
    RadioButton,
    Icon,
    Text,
    type StageProps,
    type Marker,
    FormControl,
    Input,
    ColorPickerSwatch,
    ColorPicker,
    Popover
  } from '@tableslayer/ui';
  import { IconTriangle, IconCircle, IconSquare } from '@tabler/icons-svelte';
  let { stageProps = $bindable(), selectedMarker }: { stageProps: StageProps; selectedMarker: Marker | undefined } =
    $props();
</script>

<div class="markerManager">
  <div class="markerManager__header">
    <Title as="h2" size="sm">Markers</Title>
  </div>
  <div>
    <Text>Selected Marker: {selectedMarker ? selectedMarker.name : 'None'}</Text>
  </div>
  <div class="markerManager__content">
    {#if stageProps.marker.markers.length === 0}
      <Text>No markers on this scene</Text>
    {:else}
      {#each stageProps.marker.markers as marker, index (marker.id)}
        <div class="markerManager__marker">
          <div class="markerManager__formGrid">
            <FormControl label="Name" name="name">
              {#snippet input(inputProps)}
                <Input {...inputProps} bind:value={marker.name} />
              {/snippet}
            </FormControl>
            <FormControl label="Abbreviation" name="text">
              {#snippet input(inputProps)}
                <Input {...inputProps} bind:value={marker.text} />
              {/snippet}
            </FormControl>
            <FormControl label="Shape" name="shape">
              {#snippet input(inputProps)}
                <RadioButton
                  {...inputProps}
                  selected={marker.shape.toString()}
                  options={[
                    { label: circle, value: '1' },
                    { label: square, value: '2' },
                    { label: triangle, value: '3' }
                  ]}
                  onSelectedChange={(value) => {
                    stageProps.marker.markers[index].shape = Number(value);
                  }}
                />
              {/snippet}
            </FormControl>
            <FormControl label="Size" name="size">
              {#snippet input(inputProps)}
                <RadioButton
                  {...inputProps}
                  selected={marker.size.toString()}
                  options={[
                    { label: 'S', value: '1' },
                    { label: 'M', value: '2' },
                    { label: 'L', value: '3' }
                  ]}
                  onSelectedChange={(value) => {
                    stageProps.marker.markers[index].size = Number(value);
                  }}
                />
              {/snippet}
            </FormControl>
            <div class="markerManager__colorPicker">
              <FormControl label="Color" name="shapeColor">
                {#snippet start()}
                  <Popover>
                    {#snippet trigger()}
                      <ColorPickerSwatch color={marker.shapeColor} />
                    {/snippet}
                    {#snippet content()}
                      <ColorPicker showOpacity={false} bind:hex={marker.shapeColor} />
                    {/snippet}
                  </Popover>
                {/snippet}
                {#snippet input(inputProps)}
                  <Input {...inputProps} bind:value={marker.shapeColor} />
                {/snippet}
              </FormControl>
            </div>
          </div>
          <Text>imageUrl: {marker.imageUrl}</Text>
        </div>
      {/each}
    {/if}
  </div>
</div>

{#snippet circle()}
  <Icon Icon={IconCircle} size="1.25rem" />
{/snippet}
{#snippet triangle()}
  <Icon Icon={IconTriangle} size="1.25rem" />
{/snippet}
{#snippet square()}
  <Icon Icon={IconSquare} size="1.25rem" />
{/snippet}

<style>
  .markerManager {
    padding: 1rem 2rem;
  }
  .markerManager__formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .markerManager__colorPicker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
</style>
