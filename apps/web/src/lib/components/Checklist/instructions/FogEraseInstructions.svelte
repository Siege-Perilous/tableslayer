<script lang="ts">
  import { Code, TextHighlight } from '@tableslayer/ui';
  import { IconPaint } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  Press <Code code="E" /> or click <TextHighlight text="Erase" icon={IconPaint} /> to activate the erase brush, then click
  and drag on the map to reveal areas to your players. Use the mouse wheel to adjust brush size. You can also use
  <Code code="R" /> for rectangle erase or <Code code="O" /> for ellipse erase.
</p>
