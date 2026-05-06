<script lang="ts">
  import { Code, Icon } from '@tableslayer/ui';
  import { IconScreenShare } from '@tabler/icons-svelte';
</script>

<p class="checklist__instructions">
  Click on a scene thumbnail in the left panel to switch to that scene. Click <Code code="Set active scene" /> in the
  <Icon Icon={IconScreenShare} size="1rem" /><Code code="Play" /> controls to broadcast it to the playfield. The active scene
  (shown to players) is indicated with a highlight. You can prepare scenes in advance without players seeing them.
</p>
