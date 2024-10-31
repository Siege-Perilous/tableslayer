<script lang="ts">
  let { children } = $props();
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher, toggleMode, mode } from 'mode-watcher';
  import { Icon, IconButton, Toast } from '@tableslayer/ui';
  import { IconMoon, IconSun, IconMenu2 } from '@tabler/icons-svelte';
  import { page } from '$app/stores';

  let isMenuOpen = $state(true);

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;
  };

  const routes = [
    { name: 'Avatar', path: '/avatar' },
    { name: 'AvatarPopover', path: '/avatar-popover' },
    { name: 'Button', path: '/button' },
    { name: 'Panel', path: '/panel' },
    { name: 'CodeBlock', path: '/codeblock' },
    { name: 'Color Mode', path: '/colormode' },
    { name: 'Icons', path: '/icons' },
    { name: 'IconButton', path: '/icon-button' },
    { name: 'Input', path: '/input' },
    { name: 'Link', path: '/link' },
    { name: 'Loader', path: '/loading' },
    { name: 'Popover', path: '/popover' },
    { name: 'Spacer', path: '/spacer' },
    { name: 'Stage', path: '/stage' },
    { name: 'Title', path: '/title' },
    { name: 'Toast', path: '/toast' },
    { name: 'ToolTip', path: '/tooltip' }
  ];
</script>

<ModeWatcher darkClassNames={['dark']} lightClassNames={['light']} />

<header>
  <div class="headerContainer">
    <div class="headerContainer__left">
      <IconButton variant="ghost" title="Toggle menu" onclick={toggleMenu}>
        <Icon Icon={IconMenu2} size={16} stroke={2} />
      </IconButton>
      <h2>Components</h2>
    </div>
    <IconButton onclick={toggleMode} variant="ghost" title="Toggle theme">
      <Icon Icon={$mode === 'dark' ? IconSun : IconMoon} size={16} stroke={2} />
    </IconButton>
  </div>
</header>
<div class="wrap">
  {#if isMenuOpen}
    <nav>
      <ul>
        {#each routes as route}
          <li class:isActive={route.path === $page.url.pathname}>
            <a href={route.path}>{route.name}</a>
          </li>
        {/each}
      </ul>
    </nav>
  {/if}
  <main>
    {@render children()}
  </main>
</div>

<Toast />

<style>
  header {
    background: var(--bg);
    padding: var(--size-4);
    border-bottom: var(--borderThin);
    h2 {
      font-weight: var(--font-weight-6);
      font-size: var(--font-size-2);
    }
  }
  .headerContainer {
    max-width: var(--contain-desktop);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
  }
  .headerContainer__left {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }
  .wrap {
    display: flex;
    max-width: var(--contain-desktop);
    margin: 0 auto;
    gap: var(--size-8);
  }
  nav {
    min-width: 200px;
    background: var(--bg);
    padding: var(--size-4);
    padding-left: 0;
    border-right: var(--borderThin);
    li {
      font-size: var(--font-size-1);
    }
    li.isActive {
      a {
        color: var(--fgPrimary);
      }
    }
    a {
      font-weight: var(--font-weight-6);
      display: block;
      width: 100%;
      line-height: var(--font-lineheight-5);
    }
    a:hover {
      color: var(--fgPrimary);
    }
  }
  main {
    flex-grow: 1;
    padding: var(--size-8) 0;
  }
</style>
