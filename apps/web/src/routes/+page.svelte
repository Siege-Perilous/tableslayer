<script lang="ts">
  import { dev } from '$app/environment';
  import { Title, Text, Spacer, Button, Panel } from '@tableslayer/ui';
  let { data } = $props();
  const { user } = data;
  import { IllustrationOverlook } from '$lib/components';
</script>

<IllustrationOverlook />

<Panel class="panel--signup">
  <Title size="xl" as="h1" class="heroTitle">Table Slayer</Title>
  <Spacer size={8} />
  <Text size="2rem">Create digital playmats<br />for in person tabletop games.</Text>
  <div class="flex">
    {#if dev}
      {#if user}
        <Button href="/profile" class="btn">Dashboard</Button>
      {:else}
        <Button href="/login" class="btn">Log in</Button>
        <Button href="/signup" class="btn">Sign up</Button>
      {/if}
    {:else}
      <Text size="1.5rem">Coming soon...</Text>
    {/if}
  </div>
</Panel>

<style>
  :global(.title.heroTitle) {
    font-size: 5rem;
    line-height: 1;
    font-weight: 900;
    width: fit-content;
    /*  color: transparent;  */
    /*  background-clip: text;  */
    /*  background-image: linear-gradient(0deg, rgba(122, 5, 5, 1) 0%, rgba(223, 5, 5, 1) 35%, rgba(255, 0, 50, 1) 100%);  */
    /*  text-shadow:  */
    /*  2px 2px 0 rgba(255, 255, 255, 0.2),  */
    /*  -1px 0 0 rgba(255, 255, 255, 1);  */
  }
  :global(.panel.panel--signup) {
    display: flex;
    flex-direction: column;
    width: fit-content;
    padding: var(--size-12);
    margin: 20vh auto auto 10vh;
    position: relative;
    z-index: 5;
  }
  .flex {
    display: flex;
    gap: var(--size-4);
    margin-top: var(--size-8);
  }
  :global(.heroTitle) {
    letter-spacing: 0.2rem;
  }

  @media (max-width: 768px) {
    :global(.panel.panel--signup) {
      margin: 20vh 3rem 0 3rem;
    }
  }
</style>
