<script lang="ts">
  import { toggleMode } from 'mode-watcher';
  let { data, children } = $props();
  const { user } = data;
</script>

<p>{user?.email} <a href="/logout">logout</a></p>

<button onclick={toggleMode}>Toggle Mode</button>

{@render children()}
