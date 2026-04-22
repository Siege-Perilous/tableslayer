<script lang="ts">
  import {
    RadioButton,
    Icon,
    FormControl,
    Input,
    ColorPickerSwatch,
    ColorPicker,
    Popover,
    Spacer,
    Button,
    Link,
    ConfirmActionButton,
    IconButton,
    Label,
    Text,
    Select
  } from '@tableslayer/ui';
  import {
    type StageProps,
    type Light,
    LightStyle,
    LightPulse,
    LIGHT_STYLE_COLORS,
    MapLayerType
  } from '@tableslayer/stage';
  import { IconTrash, IconArrowBack, IconFlame, IconLocationPin } from '@tabler/icons-svelte';
  import { useDeleteLightMutation } from '$lib/queries';
  import { queuePropertyUpdate, throttle } from '$lib/utils';
  import { handleMutation } from '$lib/factories';

  let {
    stageProps,
    selectedLightId = $bindable(),
    partyId = '',
    handleSelectActiveControl,
    socketUpdate,
    updateLightAndSave,
    onLightDeleted
  }: {
    stageProps: StageProps;
    selectedLightId: string | undefined;
    partyId: string;
    handleSelectActiveControl: (control: string) => void;
    socketUpdate: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateLightAndSave: (lightId: string, updateFn: (light: any) => void) => void;
    onLightDeleted?: (lightId: string) => void;
  } = $props();

  const deleteLight = useDeleteLightMutation();

  let formIsLoading = $state(false);
  let editingLightId = $derived(selectedLightId);

  const selectLightForEdit = (lightId: string) => {
    selectedLightId = lightId;
  };

  const backToList = () => {
    selectedLightId = undefined;
  };

  const handleLightDelete = async (lightId: string) => {
    await handleMutation({
      mutation: () => deleteLight.mutateAsync({ partyId, lightId }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        if (onLightDeleted) {
          onLightDeleted(lightId);
        } else {
          const updatedLights = stageProps.light.lights.filter((light) => light.id !== lightId);
          stageProps.light.lights = updatedLights;
          queuePropertyUpdate(stageProps, ['light', 'lights'], updatedLights, 'light');
        }
        selectedLightId = undefined;
        socketUpdate();
      },
      toastMessages: {
        success: { title: 'Light deleted' },
        error: { title: 'Error deleting light', body: (error) => error.message }
      }
    });
  };

  const throttledUpdate = throttle((lightId: string) => {
    updateLightAndSave(lightId, () => {});
    socketUpdate();
  }, 300);

  const styleOptions = [
    { label: 'Torch', value: LightStyle.Torch },
    { label: 'Candle', value: LightStyle.Candle },
    { label: 'Magical', value: LightStyle.Magical },
    { label: 'Fire', value: LightStyle.Fire },
    { label: 'Lantern', value: LightStyle.Lantern },
    { label: 'Spotlight', value: LightStyle.Spotlight }
  ];

  const pulseOptions = [
    { label: 'None', value: LightPulse.None.toString() },
    { label: 'Slow', value: LightPulse.Slow.toString() },
    { label: 'Med', value: LightPulse.Medium.toString() },
    { label: 'Fast', value: LightPulse.Fast.toString() }
  ];

  const getLightById = (id: string | undefined): Light | undefined => {
    if (!id) return undefined;
    return stageProps.light.lights.find((l) => l.id === id);
  };

  const editingLight = $derived(getLightById(editingLightId));

  const getStyleName = (style: LightStyle): string => {
    const option = styleOptions.find((o) => o.value === style);
    return option ? option.label : style;
  };
</script>

<div class="lightManager" data-testid="lightManager">
  <div class="lightManager__header">
    <Label>Snap to grid</Label>
    <RadioButton
      selected={stageProps.light.snapToGrid.toString()}
      options={[
        { label: 'on', value: 'true' },
        { label: 'off', value: 'false' }
      ]}
      onSelectedChange={(value) => {
        queuePropertyUpdate(stageProps, ['light', 'snapToGrid'], value === 'true', 'control');
      }}
    />
  </div>
  <div class="lightManager__content">
    {#if editingLightId !== undefined && editingLight}
      <Link onclick={backToList} class="lightManager__backButton" data-testid="lightBackButton">
        List all lights
        <Icon Icon={IconArrowBack} size="1rem" />
      </Link>
      <div class="lightManager__editView" data-testid="lightEditView">
        <div class="lightManager__light">
          <Spacer />
          <div class="lightManager__formGrid">
            <FormControl label="Style" name="style">
              {#snippet input(inputProps)}
                <Select
                  {...inputProps}
                  selected={[editingLight.style]}
                  options={styleOptions}
                  onSelectedChange={(values) => {
                    const value = values[0] as LightStyle;
                    updateLightAndSave(editingLight.id, (light) => {
                      light.style = value;
                      light.color = LIGHT_STYLE_COLORS[value];
                    });
                    socketUpdate();
                  }}
                />
              {/snippet}
            </FormControl>

            <div class="lightManager__colorPicker">
              <FormControl label="Color" name="color">
                {#snippet start()}
                  <Popover>
                    {#snippet trigger()}
                      <ColorPickerSwatch color={editingLight.color} />
                    {/snippet}
                    {#snippet content()}
                      <ColorPicker
                        showOpacity={false}
                        hex={editingLight.color}
                        onUpdate={(colorData) => {
                          updateLightAndSave(editingLight.id, (light) => {
                            light.color = colorData.hex;
                          });
                          throttledUpdate(editingLight.id);
                        }}
                      />
                    {/snippet}
                  </Popover>
                {/snippet}
                {#snippet input(inputProps)}
                  <Input
                    {...inputProps}
                    value={editingLight.color}
                    oninput={(e) => {
                      updateLightAndSave(editingLight.id, (light) => {
                        light.color = e.currentTarget.value;
                      });
                      throttledUpdate(editingLight.id);
                    }}
                  />
                {/snippet}
              </FormControl>
            </div>

            <FormControl label="Pulse" name="pulse">
              {#snippet input(inputProps)}
                <RadioButton
                  {...inputProps}
                  selected={editingLight.pulse.toString()}
                  options={pulseOptions}
                  onSelectedChange={(value) => {
                    updateLightAndSave(editingLight.id, (light) => {
                      light.pulse = Number(value);
                    });
                    socketUpdate();
                  }}
                />
              {/snippet}
            </FormControl>
          </div>

          <Spacer />

          <div class="lightManager__formGrid">
            <FormControl label="Radius" name="radius">
              {#snippet input(inputProps)}
                <div class="lightManager__slider">
                  <input
                    {...inputProps}
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={editingLight.radius}
                    oninput={(e) => {
                      const value = parseFloat(e.currentTarget.value);
                      if (!isNaN(value)) {
                        updateLightAndSave(editingLight.id, (light) => {
                          light.radius = value;
                        });
                        throttledUpdate(editingLight.id);
                      }
                    }}
                  />
                  <span class="lightManager__sliderValue">{editingLight.radius}</span>
                </div>
              {/snippet}
            </FormControl>

            <FormControl label="Opacity" name="opacity">
              {#snippet input(inputProps)}
                <div class="lightManager__slider">
                  <input
                    {...inputProps}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={editingLight.opacity ?? 1}
                    oninput={(e) => {
                      const value = parseFloat(e.currentTarget.value);
                      if (!isNaN(value)) {
                        updateLightAndSave(editingLight.id, (light) => {
                          light.opacity = value;
                        });
                        throttledUpdate(editingLight.id);
                      }
                    }}
                  />
                  <span class="lightManager__sliderValue">{(editingLight.opacity ?? 1).toFixed(1)}</span>
                </div>
              {/snippet}
            </FormControl>
          </div>

          <Spacer />

          <ConfirmActionButton action={() => handleLightDelete(editingLight.id)} actionButtonText="Confirm delete">
            {#snippet trigger({ triggerProps })}
              <Button as="div" variant="danger" disabled={formIsLoading} isLoading={formIsLoading} {...triggerProps}>
                Delete light
              </Button>
            {/snippet}
            {#snippet actionMessage()}
              Delete light?
            {/snippet}
          </ConfirmActionButton>
        </div>
      </div>
    {:else}
      <div class="lightManager__list">
        {#each stageProps.light.lights as light (light.id)}
          <div class="lightManager__listItem" data-testid="lightListItem">
            <div class="lightManager__read">
              <div class="lightManager__lightIcon" style:background-color={light.color}>
                <Icon Icon={IconFlame} size="1rem" />
              </div>
              <button class="lightManager__title" onclick={() => selectLightForEdit(light.id)}>
                {getStyleName(light.style)}
              </button>
              <div class="lightManager__editIcon" data-testid="lightEditIcon">
                <ConfirmActionButton action={() => handleLightDelete(light.id)} actionButtonText="Confirm delete">
                  {#snippet trigger({ triggerProps })}
                    <IconButton as="div" variant="ghost" {...triggerProps} data-testid="lightDeleteButton">
                      <Icon Icon={IconTrash} />
                    </IconButton>
                  {/snippet}
                  {#snippet actionMessage()}
                    Delete {getStyleName(light.style)} light?
                  {/snippet}
                </ConfirmActionButton>
              </div>
            </div>
          </div>
        {:else}
          <div>
            <Text weight={700}>No lights in this scene</Text>
            <Spacer size="0.5rem" />
            <Text color="var(--fgMuted)">
              Lights add ambiance to your scene. Place torches, candles, magical glows, and more to set the mood.
            </Text>
            <Spacer />
            {#if stageProps.activeLayer === MapLayerType.Light}
              <div class="lightManager__lightHint">
                <Icon Icon={IconLocationPin} size="2rem" />
                Click on the map to add a light
              </div>
            {:else}
              <Button onclick={() => handleSelectActiveControl('light')}>
                {#snippet start()}
                  <Icon Icon={IconFlame} size="1.25rem" />
                {/snippet}
                Add a light
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .lightManager {
    height: 100%;
    display: flex;
    flex-direction: column;
    container-type: inline-size;
  }

  .lightManager__content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-grow: 1;
    overflow-y: auto;
  }

  .lightManager__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
    height: fit-content;
    min-height: 0;
    flex-grow: 1;
    align-content: start;
    overflow-y: auto;
    padding: 2rem;
  }

  .lightManager__editView {
    grid-column: 1 / -1;
  }

  .lightManager__listItem {
    border-radius: 0.25rem;
  }

  .lightManager__listItem:hover .lightManager__editIcon {
    opacity: 1;
  }

  .lightManager__formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @container (max-width: 420px) {
    .lightManager__formGrid {
      grid-template-columns: 1fr;
    }
  }

  .lightManager__header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 2rem;
    border-bottom: var(--borderThin);
    position: sticky;
    top: 0;
    width: 100%;
  }

  .lightManager__colorPicker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .lightManager__read {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .lightManager__light {
    width: 100%;
    padding: 0 2rem;
  }

  .lightManager__editIcon {
    margin-left: auto;
    opacity: 0;
  }

  .lightManager__title {
    font-size: 0.875rem;
    cursor: pointer;
  }

  .lightManager__title:hover {
    text-decoration: underline;
  }

  .lightManager__lightIcon {
    min-width: 2.5rem;
    width: 2.5rem;
    min-height: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global {
    .lightManager__backButton {
      display: block;
      padding: 1rem 2rem;
      border-bottom: var(--borderThin);
    }
  }

  .lightManager__lightHint {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    border-radius: 0.25rem;
    background-color: var(--contrastLow);
    color: var(--fgDanger);
  }

  .lightManager__slider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .lightManager__slider input[type='range'] {
    flex: 1;
    height: 0.5rem;
    -webkit-appearance: none;
    appearance: none;
    background: var(--contrastLow);
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .lightManager__slider input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1rem;
    height: 1rem;
    background: var(--fg);
    border-radius: 50%;
    cursor: grab;
  }

  .lightManager__slider input[type='range']::-webkit-slider-thumb:active {
    cursor: grabbing;
  }

  .lightManager__slider input[type='range']::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    background: var(--fg);
    border: none;
    border-radius: 50%;
    cursor: grab;
  }

  .lightManager__slider input[type='range']::-moz-range-thumb:active {
    cursor: grabbing;
  }

  .lightManager__sliderValue {
    min-width: 2.5rem;
    text-align: right;
    font-size: 0.875rem;
    font-weight: 600;
  }
</style>
