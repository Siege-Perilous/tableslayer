<script lang="ts">
  let { color }: { color: string } = $props();
</script>

<div class="colorPickerSwatch">
  <div class="colorPickerSwatch__color" style="background-color: {color}"></div>
</div>

<style>
  .colorPickerSwatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--radius-2);
    background-image: linear-gradient(45deg, var(--contrastMedium) 26%, transparent 26%),
      linear-gradient(135deg, var(--contrastMedium) 26%, transparent 26%),
      linear-gradient(45deg, transparent 75%, var(--contrastMedium) 75%),
      linear-gradient(135deg, transparent 75%, var(--contrastMedium) 75%);
    background-size: 0.5rem 0.5rem; /* Must be a square */
    background-position:
      0 0,
      0.25rem 0,
      0.25rem -0.25rem,
      0px 0.25rem;
    overflow: hidden;
  }
  .colorPickerSwatch__color {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-2);
  }
</style>
