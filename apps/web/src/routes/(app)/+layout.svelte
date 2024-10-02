<script lang="ts">
  import { AvatarPopover, Button, Title, Link, IconButton, Icon } from '@tableslayer/ui';
  import { IconMoon, IconSun } from '@tabler/icons-svelte';
  import { toggleMode, mode } from 'mode-watcher';
  let { data, children } = $props();
  const { user } = data;
</script>

<header>
  <div class="header_container">
    <Title as="p" size="md">Table Slayer</Title>

    <div class="header_container__right">
      <IconButton onclick={toggleMode} variant="ghost" title="Toggle theme">
        <Icon Icon={$mode === 'dark' ? IconSun : IconMoon} size={16} stroke={2} />
      </IconButton>
      <AvatarPopover src={user?.avatar}>
        {#snippet content()}
          <div class="dropdown">
            <Link href="/profile">{user?.email}</Link>
            <Button href="/logout" variant="danger">logout</Button>
          </div>
        {/snippet}
      </AvatarPopover>
    </div>
  </div>
</header>

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
  .header_container__right {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }
  .dropdown {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }
</style>
