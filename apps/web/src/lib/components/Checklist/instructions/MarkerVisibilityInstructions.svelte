<script lang="ts">
  import { Code, TextHighlight } from '@tableslayer/ui';
  import { IconPokerChip } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  Select a <TextHighlight text="Marker" icon={IconPokerChip} /> and find the <Code code="Visibility" /> option in the right
  panel. Set it to <Code code="Everyone" /> to show the marker on the playfield, or <Code code="DM" /> to keep it hidden from
  players. Use this to prepare encounters or track hidden enemies.
</p>
