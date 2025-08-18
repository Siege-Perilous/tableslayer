<script lang="ts">
  import { type StageProps } from '@tableslayer/ui';
  let { stageProps }: { stageProps: StageProps } = $props();
  const activeLayer = $derived(stageProps.activeLayer);
</script>

<div class="hints">
  {#if activeLayer === 1}
    Click and drag to reveal the fog. <span>F</span>
    to clear,
    <span>Shift + F</span>
    to reset.
  {:else if activeLayer === 2}
    Left-click an empty space to add a new marker. <span>Shift + M</span>
    to exit marker mode.
  {:else if activeLayer === 3}
    Toggle drawing mode with <span>D</span>
    . Use
    <span>mouse wheel</span>
    to adjust size.
  {:else if activeLayer === 4}
    Left-click and drag to measure distance. Use <span>T</span>
    to toggle.
  {/if}
</div>

<style>
  .hints {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem;
    flex-direction: column;
    font-size: 0.875rem;
    font-weight: 600;
    gap: 1rem;
    z-index: 100;
    color: var(--fgDanger);
    text-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
  }
  .hints span {
    font-family: var(--font-mono);
    background: var(--contrastLow);
    padding: 0 4px;
    display: inline-block;
    color: var(--fg);
  }
</style>
