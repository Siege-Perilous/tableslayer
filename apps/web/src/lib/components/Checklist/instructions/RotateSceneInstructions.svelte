<script lang="ts">
  import { Code, TextHighlight } from '@tableslayer/ui';
  import { IconRotateClockwise2 } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  Use the <Code code="Scene | Map" /> toggle in the bottom left corner and click
  <TextHighlight text="Rotate" icon={IconRotateClockwise2} /> to rotate the entire scene view. Unlike map rotation, this rotation
  is only seen by you and does not affect the playfield.
</p>
