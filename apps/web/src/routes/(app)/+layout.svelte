<script lang="ts">
  import { Avatar, Button, Title } from '@tableslayer/ui';
  import { toggleMode } from 'mode-watcher';
  let { data, children } = $props();
  const { user } = data;
</script>

<header>
  <div class="header_container">
    <Title as="p" size="md">Table Slayer</Title>
    <Avatar src={user.avatar} alt={user?.name} initials={user.name.charAt(0)} size="lg" />
    <Button href="/logout" variant="link">logout</Button>
  </div>
</header>

<button onclick={toggleMode}>Toggle Mode</button>

{@render children()}

<style>
  header {
    background: var(--bg);
    padding: var(--size-4);
    border-bottom: var(--borderThin);
  }
  .header_container {
    max-width: var(--contain-desktop);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
  }
</style>
