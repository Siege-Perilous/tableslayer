<script lang="ts">
  import { MyCounterButton } from '@tableslayer/ui';
  export let data;
  console.log(data.scenes[0].title);
</script>

<h1>Web</h1>
<MyCounterButton />
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

{#each data.scenes as scene}
  <h2>{scene.title}</h2>
  <p>{scene.userId}</p>
{/each}
