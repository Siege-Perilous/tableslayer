<script lang="ts">
  export let data;
  const { party, members } = data;
  console.log(data);
</script>

<h2>Members of {party?.name}</h2>
{#if members.length === 0}
  <p>No members found.</p>
{:else}
  {#each members as member}
    <p>{member.email}</p>
  {/each}
{/if}
