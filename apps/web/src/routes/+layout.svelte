<script lang="ts">
  import { ModeWatcher, toggleMode } from 'mode-watcher';
  import '@tableslayer/ui/styles/globals.css';
</script>

<ModeWatcher />
<button onclick={toggleMode}>Toggle Mode</button>

<slot />

<style>
  :global(body) {
    background: var(--bg);
  }
</style>
