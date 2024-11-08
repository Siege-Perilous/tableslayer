<script lang="ts">
  import { Button, Icon } from '@tableslayer/ui';
  import { IconPlus, IconScreenShare } from '@tabler/icons-svelte';
  import classNames from 'classnames';
  const scenes = [
    {
      name: 'Vampire Mansion upstairs',
      id: 1,
      image: 'https://snid.es/2024NOV/cKVSvRcTv9cw5uWE.jpeg',
      isActive: true,
      isProjected: false
    },
    {
      name: 'Cave of the Emerald Queen',
      id: 2,
      image: 'https://snid.es/2024NOV/7wSTPeSHK9JCm9qY.jpeg',
      isActive: false,
      isProjected: true
    },
    {
      name: 'Fey Village',
      id: 3,
      image: 'https://snid.es/2024NOV/HM5T6JmcOGco5TF6.jpeg',
      isActive: false,
      isProjected: false
    }
  ];
</script>

<div class="scenes">
  <Button variant="ghost">
    {#snippet start()}
      <Icon Icon={IconPlus} />
    {/snippet}
    Add scene
  </Button>
  {#each scenes as scene}
    {@const sceneSelectorClasses = classNames(
      'scene',
      scene.isActive && 'scene--isActive',
      scene.isProjected && 'scene--isProjected'
    )}
    <div class={sceneSelectorClasses} style={`background-image: url(${scene.image});`}>
      {#if scene.isProjected}
        <div class="scene__projectedIcon">
          <Icon Icon={IconScreenShare} size="1.25rem" stroke={2} />
        </div>
      {/if}
      <div class="scene__text">{scene.name}</div>
    </div>
  {/each}
</div>

<style>
  .scenes {
    border-right: var(--borderThin);
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
    padding: 1rem 2rem;
    height: 100%;
    width: 100%;
    background: var(--bg);
  }
  .scene {
    position: relative;
    border: var(--borderThick);
    border-radius: var(--radius-2);
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background-size: 100%;
    box-shadow: 1px 1px 32px 4px rgba(0, 0, 0, 0.76) inset;
    cursor: pointer;
  }
  .scene:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: var(--radius-2);
    border: solid var(--bg) 0.25rem;
  }
  .scene:hover:not(.scene--isActive) {
    border-color: var(--primary-800);
  }
  .scene--isActive {
    border-width: 2px;
    border-color: var(--fgPrimary);
  }
  .scene__text {
    position: absolute;
    left: 0.5rem;
    bottom: 0.5rem;
    z-index: 2;
    padding: 0.25rem 0.5rem;
    background: var(--bg);
    color: var(--fg);
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: calc(100% - 1rem);
    white-space: nowrap;
    font-size: 0.85rem;
  }
  .scene__projectedIcon {
    background: var(--fgPrimary);
    padding: 0.25rem;
    height: 1.5rem;
    width: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2);
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
  }
</style>
