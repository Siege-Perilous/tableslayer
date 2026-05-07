<script lang="ts">
  import { Code, TextHighlight } from '@tableslayer/ui';
  import { IconMap } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  Hold <Code code="Shift" /> and use the mouse wheel to scale the map, or open the
  <TextHighlight text="Map" icon={IconMap} /> controls and adjust the <Code code="Scale" /> input. Fine-tune the scale so
  your grid aligns perfectly with the map's grid lines.
</p>
