<script lang="ts">
  import { ModeWatcher } from 'mode-watcher';
  import '@tableslayer/ui/styles/globals.css';
</script>

<ModeWatcher />

<slot />

<style>
  :global(body) {
    background: var(--bg);
  }
</style>
