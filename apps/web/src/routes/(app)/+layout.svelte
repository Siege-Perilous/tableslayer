<script lang="ts">
  import { Avatar, Button, Title, Popover } from '@tableslayer/ui';
  import { toggleMode } from 'mode-watcher';
  let { data, children } = $props();
  const { user } = data;
</script>

<header>
  <div class="header_container">
    <Title as="p" size="md">Table Slayer</Title>
    <Popover>
      {#snippet trigger()}
        <Avatar src={user?.avatar} alt={user?.name} initials={user?.name.charAt(0)} size="md" />
      {/snippet}
      {#snippet content()}
        <Button href="/logout" variant="link">logout</Button>
      {/snippet}
    </Popover>
  </div>
</header>

<button onclick={toggleMode}>Toggle Mode</button>

{@render children()}

<style>
  header {
    background: var(--bg);
    padding: var(--size-2);
    border-bottom: var(--borderThin);
  }
  .header_container {
    max-width: var(--contain-desktop);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
