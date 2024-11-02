<script lang="ts">
  import { Link, Panel, Title } from '@tableslayer/ui';

  let { data } = $props();
  const { party, gameSessions, members } = $derived(data);
</script>

<div class="container">
  <Title as="h1" size="lg">{party.name}</Title>
  <div class="containerLayout">
    <main>
      <div class="sessionList">
        {#each gameSessions as session}
          <Panel class="sessionPanel">
            <Link href={`${party.slug}/${session.slug}`}>{session.name}</Link>
          </Panel>
        {/each}
      </div>
    </main>
    <aside>
      <Link href={`${party.slug}/members`}>Members</Link>
      {#each members as member}
        {member.email}
      {/each}
    </aside>
  </div>
</div>

<style>
  :global(.sessionPanel) {
    padding: var(--size-4);
  }
  .container {
    max-width: var(--contain-desktop);
    margin: var(--size-12) auto;
  }
  .containerLayout {
    display: grid;
    grid-template-columns: 3fr 1fr;
    margin-top: var(--size-8);
    gap: var(--size-12);
  }
  .sessionList {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--size-4);
  }
</style>
