<script lang="ts">
  let { data } = $props();
  const { gameSession } = $derived(data);
</script>

{gameSession.name}
