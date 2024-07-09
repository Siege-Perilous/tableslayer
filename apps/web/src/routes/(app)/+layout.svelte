<script lang="ts">
  import { toggleMode } from 'mode-watcher';
  export let data;
</script>

<p>{data.user.email} <a href="/logout">logout</a></p>

<button onclick={toggleMode}>Toggle Mode</button>

<slot />
