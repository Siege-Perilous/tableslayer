<script lang="ts">
  import { Code, TextHighlight } from '@tableslayer/ui';
  import { IconShadow } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  In the <TextHighlight text="Fog" icon={IconShadow} /> controls, adjust the <Code code="Player opacity" /> slider. This controls
  how visible the fog is on the playfield. A higher value makes unexplored areas more hidden, while a lower value lets players
  peek through slightly.
</p>
