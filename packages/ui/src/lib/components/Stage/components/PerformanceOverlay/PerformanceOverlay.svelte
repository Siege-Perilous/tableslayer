<script lang="ts">
  import {
    performanceMetrics,
    getAverageFps,
    get1PercentLowFps,
    getFrameTimes
  } from '../../helpers/performanceMetrics.svelte';

  interface Props {
    visible?: boolean;
    disabledLayers?: string[];
  }

  const { visible = true, disabledLayers = [] }: Props = $props();

  const metrics = $derived(performanceMetrics.value);
  const frameTimes = $derived(getFrameTimes());
  const avgFps = $derived(getAverageFps());
  const lowFps = $derived(get1PercentLowFps());

  // Graph dimensions
  const GRAPH_WIDTH = 200;
  const GRAPH_HEIGHT = 60;
  const MAX_FRAME_TIME = 50; // Cap at 50ms (20fps) for graph scale

  // Generate SVG path for frame time graph
  const graphPath = $derived(() => {
    if (frameTimes.length < 2) return '';

    const points = frameTimes.map((ft, i) => {
      const x = (i / (frameTimes.length - 1)) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT - Math.min(ft / MAX_FRAME_TIME, 1) * GRAPH_HEIGHT;
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  });

  // Color based on FPS
  const fpsColor = $derived(() => {
    const fps = metrics.fps;
    if (fps >= 55) return 'var(--fgSuccess)';
    if (fps >= 30) return 'var(--fgWarning)';
    return 'var(--fgDanger)';
  });
</script>

{#if visible}
  <div class="perf-overlay">
    <div class="perf-overlay__header">Performance</div>

    <div class="perf-overlay__section">
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">FPS</span>
        <span class="perf-overlay__value" style="color: {fpsColor()}">{metrics.fps.toFixed(0)}</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Avg</span>
        <span class="perf-overlay__value">{avgFps.toFixed(0)}</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">1% Low</span>
        <span class="perf-overlay__value">{lowFps.toFixed(0)}</span>
      </div>
    </div>

    <div class="perf-overlay__graph">
      <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} class="perf-overlay__svg">
        <!-- 60fps line (16.67ms) -->
        <line
          x1="0"
          y1={GRAPH_HEIGHT - (16.67 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          x2={GRAPH_WIDTH}
          y2={GRAPH_HEIGHT - (16.67 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          stroke="var(--fgSuccess)"
          stroke-opacity="0.3"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <!-- 30fps line (33.33ms) -->
        <line
          x1="0"
          y1={GRAPH_HEIGHT - (33.33 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          x2={GRAPH_WIDTH}
          y2={GRAPH_HEIGHT - (33.33 / MAX_FRAME_TIME) * GRAPH_HEIGHT}
          stroke="var(--fgWarning)"
          stroke-opacity="0.3"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <!-- Frame time path -->
        <path d={graphPath()} fill="none" stroke="var(--fgPrimary)" stroke-width="1.5" />
      </svg>
    </div>

    <div class="perf-overlay__section">
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Frame</span>
        <span class="perf-overlay__value">{metrics.frameTime.toFixed(2)}ms</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Composer</span>
        <span class="perf-overlay__value">{metrics.composerTime.toFixed(2)}ms</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Overlay</span>
        <span class="perf-overlay__value">{metrics.overlayTime.toFixed(2)}ms</span>
      </div>
    </div>

    <div class="perf-overlay__section">
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Draw calls</span>
        <span class="perf-overlay__value">{metrics.drawCalls}</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Triangles</span>
        <span class="perf-overlay__value">{metrics.triangles}</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Textures</span>
        <span class="perf-overlay__value">{metrics.textures}</span>
      </div>
      <div class="perf-overlay__row">
        <span class="perf-overlay__label">Geometries</span>
        <span class="perf-overlay__value">{metrics.geometries}</span>
      </div>
    </div>

    {#if disabledLayers.length > 0}
      <div class="perf-overlay__section">
        <div class="perf-overlay__sublabel">Disabled layers</div>
        {#each disabledLayers as layer}
          <div class="perf-overlay__disabled-layer">{layer}</div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .perf-overlay {
    position: absolute;
    top: 8px;
    left: 8px;
    background: var(--bgOverlay, rgba(0, 0, 0, 0.8));
    color: var(--fg, #fff);
    font-family: monospace;
    font-size: 11px;
    padding: 8px;
    border-radius: 4px;
    z-index: 1000;
    pointer-events: none;
    min-width: 200px;
  }

  .perf-overlay__header {
    font-weight: bold;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--fgMuted, #666);
  }

  .perf-overlay__section {
    margin-bottom: 8px;
  }

  .perf-overlay__section:last-child {
    margin-bottom: 0;
  }

  .perf-overlay__row {
    display: flex;
    justify-content: space-between;
    line-height: 1.4;
  }

  .perf-overlay__label {
    color: var(--fgMuted, #999);
  }

  .perf-overlay__value {
    font-weight: 500;
  }

  .perf-overlay__sublabel {
    color: var(--fgMuted, #999);
    font-size: 10px;
    margin-bottom: 2px;
  }

  .perf-overlay__disabled-layer {
    color: var(--fgWarning, #f59e0b);
    font-size: 10px;
    padding-left: 8px;
  }

  .perf-overlay__graph {
    margin: 8px 0;
    background: var(--bgSubtle, rgba(255, 255, 255, 0.05));
    border-radius: 2px;
    overflow: hidden;
  }

  .perf-overlay__svg {
    display: block;
  }
</style>
