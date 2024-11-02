<script lang="ts">
  import { Link } from '@tableslayer/ui';

  let { data } = $props();
  const { party, gameSessions } = $derived(data);
</script>

{party.name}
{#each gameSessions as session}
  <a href={`${party.slug}/${session.slug}`}>{session.name}</a>
{/each}
<Link href={`${party.slug}/members`}>Members</Link>
