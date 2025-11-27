<script lang="ts">
  import { BrushSizeSlider } from '../BrushSizeSlider';

  interface Props {
    brushSize: number;
    onBrushSizeChange: (value: number) => void;
  }

  let { brushSize, onBrushSizeChange }: Props = $props();
</script>

<div class="fogSliders">
  <BrushSizeSlider {brushSize} {onBrushSizeChange} min={5} max={20} curve="linear" displayAsPercentage={true} />
</div>

<style>
  .fogSliders {
    position: absolute;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 10;
    pointer-events: auto;
    background-color: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.5rem 0rem;
    align-items: center;
  }
</style>
