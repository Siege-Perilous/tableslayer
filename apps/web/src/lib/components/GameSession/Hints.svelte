<script lang="ts">
  import { type StageProps } from '@tableslayer/ui';
  let { stageProps }: { stageProps: StageProps } = $props();
  const activeLayer = $derived(stageProps.activeLayer);
</script>

<div class="hints">
  {#if activeLayer === 1}
    Click and drag to reveal the fog. <span>F</span> to clear, <span>Shift + F</span> to reset.
  {:else if activeLayer === 2}
    Click an empty space to add a new marker. Click a marker to edit or move it. <span>Shift + M</span> to lock.
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
