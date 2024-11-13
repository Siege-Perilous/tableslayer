<script lang="ts">
  import { dev } from '$app/environment';
  import { Title, Text, Spacer, Button } from '@tableslayer/ui';
  let { data } = $props();
  const { user } = data;
</script>

<div class="container">
  <Title size="xl" as="h1" class="heroTitle">Table Slayer</Title>
  <Spacer size={8} />
  <Text size="xl">Tools to build animated battle maps<br /> for your digital tabletop.</Text>
  <div class="flex">
    {#if dev}
      {#if user}
        <Button href="/profile" class="btn">Dashboard</Button>
      {:else}
        <Button href="/login" class="btn">Log in</Button>
        <Button href="/signup" class="btn">Sign up</Button>
      {/if}
    {/if}
  </div>
</div>

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
  :global(.btn) {
    width: 100px;
  }
  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin: 20% auto 0 auto;
    max-width: var(--contain-desktop);
    padding-left: var(--size-12);
  }
  .flex {
    display: flex;
    gap: var(--size-4);
    margin-top: var(--size-8);
  }
  :global(.heroTitle) {
    display: inline-block;
    padding: 2rem;
    background-color: var(--primary-600);
    letter-spacing: 0.2rem;
    color: var(--fg);
    text-shadow: 4px 4px 0px var(--primary-900);
  }
</style>
