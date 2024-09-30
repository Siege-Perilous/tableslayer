<script lang="ts">
  import { AvatarPopover, Button, Title, Popover } from '@tableslayer/ui';
  import { toggleMode } from 'mode-watcher';
  let { data, children } = $props();
  const { user } = data;
</script>

<header>
  <div class="header_container">
    <Title as="p" size="md">Table Slayer</Title>

    <AvatarPopover src={user?.avatar}>
      {#snippet content()}
        {user?.email}
        <Button href="/logout" variant="link">logout</Button>
      {/snippet}
    </AvatarPopover>
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
