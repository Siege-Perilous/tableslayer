<script lang="ts">
  import { Text, Spacer, Button, Panel, Hr, Link } from '@tableslayer/ui';
  import { IllustrationOverlook, Logo, Head } from '$lib/components';
</script>

<Head title="Table Slayer" description="Tools to create animated battle maps for in person RPG games." />

<IllustrationOverlook />

<Panel class="panel--home">
  <Logo class="logo" />
  <Spacer size={8} />
  <Text size="1.5rem">Tools to create animated battle maps for in person RPG games.</Text>
  <Spacer />
  <Hr />
  <Spacer size={8} />
  <div>
    <Text>
      Table Slayer is currently in open beta. <Link
        href="https://bsky.app/profile/davesnider.com/post/3lkvum6xtjs2e"
        target="_blank"
      >
        This short video
      </Link> will give you an idea of what it can do. The source is available on <Link
        href="https://github.com/siege-perilous/tableslayer"
        target="_blank"
      >
        GitHub
      </Link>.
    </Text>
    <Spacer size={8} />
    <Button href="/signup" class="btn">Create an account</Button>
  </div>
</Panel>

<style>
  :global(.title.heroTitle) {
    font-size: 4rem;
    line-height: 1.2;
    font-weight: 900;
    width: fit-content;
    /*  color: transparent;  */
    /*  background-clip: text;  */
    /*  background-image: linear-gradient(0deg, rgba(122, 5, 5, 1) 0%, rgba(223, 5, 5, 1) 35%, rgba(255, 0, 50, 1) 100%);  */
    /*  text-shadow:  */
    /*  2px 2px 0 rgba(255, 255, 255, 0.2),  */
    /*  -1px 0 0 rgba(255, 255, 255, 1);  */
  }
  :global {
    .panel.panel--home {
      display: flex;
      flex-direction: column;
      width: fit-content;
      max-width: 480px;
      padding: 3rem;
      margin: 20vh auto auto 10vh;
      position: relative;
      z-index: 5;
    }
    .logo {
      width: 392px;
      max-width: 100%;
      margin: 0 auto;
      color: var(--fg);
    }
  }
  .flex {
    display: flex;
    gap: var(--size-4);
  }
  :global(.heroTitle) {
    letter-spacing: 0.2rem;
  }

  @media (max-width: 768px) {
    :global(.panel.panel--home) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
