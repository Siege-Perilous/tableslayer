<script lang="ts">
  let { data } = $props();
  const { invites } = data;
</script>

{#each invites as invite}
  <p>You have been invited to join {invite.party.name}</p>
{/each}
