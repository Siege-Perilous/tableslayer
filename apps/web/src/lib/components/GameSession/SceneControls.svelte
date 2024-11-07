<script lang="ts">
  import { Icon } from '@tableslayer/ui';
  import { IconGrid4x4, IconSelector, IconMap, IconCloud, IconUmbrella } from '@tabler/icons-svelte';
</script>

<div class="sceneControls">
  <div class="sceneControls__item">
    <div class="sceneControls__layer">
      <Icon Icon={IconMap} size="1.5rem" stroke={2} />
      Map
    </div>
    <div class="sceneControls__selectorBtn">
      <Icon Icon={IconSelector} size="0.85rem" class="sceneControls__selectorIcon" />
    </div>
  </div>
  <div class="sceneControls__item">
    <div class="sceneControls__layer sceneControls__layer--isActive">
      <Icon Icon={IconCloud} size="1.5rem" stroke={2} />
      Fog
    </div>
    <div class="sceneControls__selectorBtn">
      <Icon Icon={IconSelector} size="0.85rem" class="sceneControls__selectorIcon" />
    </div>
  </div>
  <div class="sceneControls__item">
    <div class="sceneControls__layer">
      <Icon Icon={IconUmbrella} size="1.5rem" stroke={2} />
      Weather
    </div>
    <div class="sceneControls__selectorBtn">
      <Icon Icon={IconSelector} size="0.85rem" class="sceneControls__selectorIcon" />
    </div>
  </div>
  <div class="sceneControls__item">
    <div class="sceneControls__layer">
      <Icon Icon={IconGrid4x4} size="1.5rem" stroke={2} />
      Grid
    </div>
    <div class="sceneControls__selectorBtn">
      <Icon Icon={IconSelector} size="0.85rem" class="sceneControls__selectorIcon" />
    </div>
  </div>
</div>

<style>
  :global {
    .sceneControls__selectorBtn {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 2rem;
      border-radius: var(--radius-2);
      width: 1.25rem;
    }

    .sceneControls__selectorBtn:hover {
      cursor: pointer;
      background: var(--contrastMedium);
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
    bottom: 3rem;
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
  }
  .sceneControls__layer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-2);
  }
  .sceneControls__layer:hover:not(.sceneControls__layer--isActive) {
    cursor: pointer;
    background: var(--contrastMedium);
  }
  .sceneControls__layer--isActive {
    background: var(--fgPrimary);
  }
</style>
