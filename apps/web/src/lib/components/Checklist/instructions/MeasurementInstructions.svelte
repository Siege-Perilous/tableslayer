<script lang="ts">
  import { Code, TextHighlight } from '@tableslayer/ui';
  import { IconRuler } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  Press <Code code="T" /> or click <TextHighlight text="Measure" icon={IconRuler} /> to activate the measure tool. Click two
  points on the map to measure the distance between them in grid squares. This is useful for determining movement ranges,
  spell distances, or any tactical calculations during combat.
</p>
