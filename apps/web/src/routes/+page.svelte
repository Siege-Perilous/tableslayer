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
    <Button href="/signup" class="btn">Join beta</Button>
  </div>
</Panel>

<style>
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
  @media (max-width: 768px) {
    :global(.panel.panel--home) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
