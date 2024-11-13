<script lang="ts">
  import { ColorMode, Icon, Popover, ColorPicker, type ColorUpdatePayload } from '@tableslayer/ui';
  import { IconGrid4x4, IconSettings, IconShadow, IconSelector, IconMap, IconCloudSnow } from '@tabler/icons-svelte';
  import { type StageProps, MapLayerType } from '@tableslayer/ui';

  let {
    onUpdateStage,
    stageProps
  }: { onUpdateStage: (newProps: Partial<StageProps>) => void; stageProps: StageProps } = $props();

  let activeControl = $state('map');
  let activeLayer = $state(0);
  let colorData: ColorUpdatePayload = $state({
    hex: '#000000ff',
    rgba: { r: 0, g: 0, b: 0, a: 1 },
    hsva: { h: 0, s: 0, v: 0, a: 1 },
    hsla: { h: 0, s: 0, l: 0, a: 1 }
  });
  let gridHex = $state('#ff0000ff');
  let fogHex = $state('#000000ff');

  type SceneControl = {
    id: string;
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    icon: any;
    text: string;
    mapLayer: number;
  };

  const sceneControlArray: SceneControl[] = [
    {
      id: 'map',
      icon: IconMap,
      text: 'Map',
      mapLayer: MapLayerType.None
    },
    {
      id: 'fog',
      icon: IconShadow,
      text: 'Fog',
      mapLayer: MapLayerType.FogOfWar
    },
    {
      id: 'weather',
      icon: IconCloudSnow,
      text: 'Weather',
      mapLayer: MapLayerType.None
    },
    {
      id: 'grid',
      icon: IconGrid4x4,
      text: 'Grid',
      mapLayer: MapLayerType.None
    }
  ];

  const handleSelectLayer = (sceneControl: SceneControl) => {
    if (activeControl === sceneControl.id) {
      activeLayer = 0;
      activeControl = '';
    } else {
      activeLayer = sceneControl.mapLayer;
      activeControl = sceneControl.id;
    }
    onUpdateStage({
      scene: {
        ...stageProps.scene,
        activeLayer
      }
    });
  };

  // Ensure the handleFogColorUpdate function is typed with ColorUpdatePayload
  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    colorData = cd;
    onUpdateStage({
      fogOfWar: {
        ...stageProps.fogOfWar,
        fogColor: colorData.hex.slice(0, -2), // Remove last two characters (opacity)
        opacity: colorData.rgba.a
      }
    });
  };

  // Ensure the handleGridColorUpdate function is also typed with ColorUpdatePayload
  const handleGridColorUpdate = (cd: ColorUpdatePayload) => {
    colorData = cd;
    gridHex = colorData.hex;
    onUpdateStage({
      grid: {
        ...stageProps.grid,
        lineColor: { r: colorData.rgba.r, g: colorData.rgba.g, b: colorData.rgba.b },
        opacity: colorData.rgba.a
      }
    });
  };
</script>

<!-- Usage of ColorPicker -->
{#snippet gridControls()}
  <ColorPicker bind:hex={gridHex} onUpdate={handleGridColorUpdate} />
{/snippet}
{#snippet fogControls()}
  <ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} />
{/snippet}

<ColorMode mode="dark">
  <div class="sceneControls">
    {#each sceneControlArray as scene}
      <div class="sceneControls__item">
        <button
          class="sceneControls__layer {activeControl === scene.id ? 'sceneControls__layer--isActive' : ''}"
          onclick={() => handleSelectLayer(scene)}
        >
          <Icon Icon={scene.icon} size="1.5rem" stroke={2} />
          {scene.text}
        </button>
        <Popover positioning={{ placement: 'bottom', gutter: 8 }}>
          {#snippet trigger()}
            <div class="sceneControls__selectorBtn">
              <Icon Icon={IconSelector} size="0.85rem" class="sceneControls__selectorIcon" />
            </div>
          {/snippet}
          {#snippet content()}
            {#if scene.id === 'grid'}
              {@render gridControls()}
            {:else if scene.id === 'fog'}
              {@render fogControls()}
            {/if}
          {/snippet}
        </Popover>
      </div>
    {/each}
    <div class="sceneControls__settings">
      <Icon Icon={IconSettings} size="1.5rem" stroke={2} />
    </div>
  </div>
</ColorMode>

<style>
  :global {
    .light {
      --sceneControlItemBgHover: var(--primary-50);
      --sceneControlItemBorder: solid 2px var(--fg);
      --sceneControlItemBorderHover: solid 2px var(--primary-600);
    }
    .dark {
      --sceneControlItemBgHover: var(--primary-950);
      --sceneControlItemBorder: solid 2px transparent;
      --sceneControlItemBorderHover: solid 2px var(--primary-500);
    }
    .sceneControls__selectorBtn {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 2rem;
      border-radius: var(--radius-2);
      width: 1.25rem;
      border: var(--sceneControlItemBorder);
    }

    .sceneControls__selectorBtn:hover {
      cursor: pointer;
      background: var(--sceneControlItemBgHover);
      border: var(--sceneControlItemBorderHover);
    }
    .sceneControls__selectorIcon {
      color: var(--contrastHigh);
    }
  }
  .sceneControls {
    background: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.25rem;
    width: auto;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
  }
  .sceneControls__item {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 700;
    gap: 0.125rem;
  }
  .sceneControls__layer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-2);
    border: var(--sceneControlItemBorder);
  }
  .sceneControls__layer:hover:not(.sceneControls__layer--isActive) {
    cursor: pointer;
    background: var(--sceneControlItemBgHover);
    border: var(--sceneControlItemBorderHover);
  }
  .sceneControls__layer--isActive {
    background: var(--fgPrimary);
  }
  .sceneControls__settings {
    display: flex;
    padding: 0 0.25rem 0 0.5rem;
    align-items: center;
    justify-content: center;
    border-left: var(--borderThin);
    height: 2rem;
  }
</style>
