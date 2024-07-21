<script lang="ts">
  let { data } = $props();
  const { invite } = data;
</script>

{#if !invite}
  <p>No invites found</p>
{/if}

<p>You have been invited to join {invite?.party?.name}</p>
