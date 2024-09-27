<script lang="ts">
  let { children } = $props();
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher, toggleMode, mode } from 'mode-watcher';
  import { Icon, IconButton } from '@tableslayer/ui';
  import { IconMoon, IconSun } from '@tabler/icons-svelte';
  const routes = [
    { name: 'Avatar', path: '/avatar' },
    { name: 'Button', path: '/button' },
    { name: 'Panel', path: '/panel' },
    { name: 'Color Mode', path: '/colormode' },
    { name: 'CodeBlock', path: '/codeblock' },
    { name: 'Stage', path: '/stage' },
    { name: 'Icons', path: '/icons' },
    { name: 'IconButton', path: '/icon-button' },
    { name: 'Input', path: '/input' },
    { name: 'Link', path: '/link' },
    { name: 'Loader', path: '/loading' },
    { name: 'Spacer', path: '/spacer' },
    { name: 'Title', path: '/title' },
    { name: 'ToolTip', path: '/tooltip' }
  ];
</script>

<ModeWatcher darkClassNames={['dark']} lightClassNames={['light']} />

<header>
  <div class="headerContainer">
    <h2>Components</h2>
    <IconButton onclick={toggleMode} variant="ghost" title="Toggle theme">
      <Icon Icon={$mode === 'dark' ? IconSun : IconMoon} size={16} stroke={2} />
    </IconButton>
  </div>
</header>
<div class="wrap">
  <nav>
    <ul>
      {#each routes as route}
        <li>
          <a href={route.path}>{route.name}</a>
        </li>
      {/each}
    </ul>
  </nav>
  <main>
    {@render children()}
  </main>
</div>

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
  .wrap {
    display: flex;
    min-height: 100vh;
    max-width: var(--contain-desktop);
    margin: 0 auto;
    gap: var(--size-8);
  }
  nav {
    width: 200px;
    background: var(--bg);
    padding: var(--size-4);
    padding-left: 0;
    border-right: var(--borderThin);
    li {
      font-size: var(--font-size-1);
    }
    a {
      font-weight: var(--font-weight-6);
      display: block;
      width: 100%;
      line-height: var(--font-lineheight-5);
    }
    a:hover {
      color: var(--primary-500);
    }
  }
  main {
    flex-grow: 1;
    padding: var(--size-8) 0;
  }
</style>
