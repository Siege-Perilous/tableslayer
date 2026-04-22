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
    ConfirmActionButton
  } from '@tableslayer/ui';
  import {
    type StageProps,
    type Light,
    LightStyle,
    LightPulse,
    LIGHT_STYLE_COLORS,
    MapLayerType
  } from '@tableslayer/stage';
  import { IconTrash, IconArrowBack, IconFlame } from '@tabler/icons-svelte';
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
    { label: 'Moonlight', value: LightStyle.Moonlight }
  ];

  const pulseOptions = [
    { label: 'None', value: LightPulse.None.toString() },
    { label: 'Slow', value: LightPulse.Slow.toString() },
    { label: 'Medium', value: LightPulse.Medium.toString() },
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

<div class="lightManager">
  {#if !editingLightId}
    <!-- Light List View -->
    <div class="lightManager__header">
      <span class="lightManager__title">Lights</span>
      <Button
        size="sm"
        variant={stageProps.activeLayer === MapLayerType.Light ? 'primary' : 'ghost'}
        onclick={() => handleSelectActiveControl('light')}
      >
        {#if stageProps.activeLayer === MapLayerType.Light}
          Placing lights
        {:else}
          Place light
        {/if}
      </Button>
    </div>
    <Spacer size="0.5rem" />

    {#if stageProps.light.lights.length === 0}
      <div class="lightManager__empty">
        <p class="lightManager__emptyText">No lights placed yet. Click "Place light" to add one.</p>
      </div>
    {:else}
      <div class="lightManager__list">
        {#each stageProps.light.lights as light (light.id)}
          <button class="lightManager__item" onclick={() => selectLightForEdit(light.id)}>
            <div class="lightManager__itemIcon" style="background-color: {light.color}">
              <Icon Icon={IconFlame} size="1rem" />
            </div>
            <div class="lightManager__itemInfo">
              <span class="lightManager__itemTitle">{getStyleName(light.style)}</span>
              <span class="lightManager__itemSub">Radius: {light.radius}</span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  {:else if editingLight}
    <!-- Light Edit View -->
    <div class="lightManager__header">
      <Button size="sm" variant="ghost" onclick={backToList}>
        <Icon Icon={IconArrowBack} size="1rem" />
        Back
      </Button>
    </div>
    <Spacer size="0.5rem" />

    <FormControl label="Style" name="style">
      {#snippet input(inputProps)}
        <RadioButton
          {...inputProps}
          selected={editingLight.style}
          options={styleOptions}
          onSelectedChange={(value) => {
            updateLightAndSave(editingLight.id, (light) => {
              light.style = value;
              light.color = LIGHT_STYLE_COLORS[value as LightStyle];
            });
            socketUpdate();
          }}
        />
      {/snippet}
    </FormControl>

    <Spacer size="0.5rem" />

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

    <Spacer size="0.5rem" />

    <FormControl label="Radius (grid units)" name="radius">
      {#snippet input(inputProps)}
        <Input
          {...inputProps}
          type="number"
          min={0.5}
          max={20}
          step={0.5}
          value={editingLight.radius.toString()}
          oninput={(e) => {
            const value = parseFloat(e.currentTarget.value);
            if (!isNaN(value) && value >= 0.5) {
              updateLightAndSave(editingLight.id, (light) => {
                light.radius = value;
              });
              throttledUpdate(editingLight.id);
            }
          }}
        />
      {/snippet}
    </FormControl>

    <Spacer size="0.5rem" />

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

    <Spacer size="1rem" />

    <ConfirmActionButton action={() => handleLightDelete(editingLight.id)} actionButtonText="Confirm delete">
      {#snippet trigger({ triggerProps })}
        <Button as="div" variant="danger" disabled={formIsLoading} isLoading={formIsLoading} {...triggerProps}>
          <Icon Icon={IconTrash} size="1rem" />
          Delete light
        </Button>
      {/snippet}
      {#snippet actionMessage()}
        Delete this light?
      {/snippet}
    </ConfirmActionButton>
  {/if}
</div>

<style>
  .lightManager {
    padding: 0.5rem;
  }

  .lightManager__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .lightManager__title {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .lightManager__empty {
    padding: 1rem;
    text-align: center;
  }

  .lightManager__emptyText {
    color: var(--fgMuted);
    font-size: 0.875rem;
  }

  .lightManager__list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .lightManager__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: var(--radius-2);
    border: var(--borderThin);
    cursor: pointer;
    background: var(--bg);
    width: 100%;
    text-align: left;
  }

  .lightManager__item:hover {
    background: var(--bgMuted);
  }

  .lightManager__itemIcon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightManager__itemInfo {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .lightManager__itemTitle {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .lightManager__itemSub {
    color: var(--fgMuted);
    font-size: 0.75rem;
  }
</style>
