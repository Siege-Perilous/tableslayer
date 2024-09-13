<script lang="ts">
  let { children } = $props();
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher, toggleMode } from 'mode-watcher';
</script>

<ModeWatcher darkClassNames={['dark']} lightClassNames={['light']} />

<button onclick={toggleMode}>Toggle Mode</button>

{@render children()}
