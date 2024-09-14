<script lang="ts">
  let { children } = $props();
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher, toggleMode } from 'mode-watcher';
  import { Button } from '@tableslayer/ui';
  const routes = [
    { name: 'Avatar', path: '/avatar' },
    { name: 'Button', path: '/button' },
    { name: 'Color Mode', path: '/colormode' },
    { name: 'Stage', path: '/stage' },
    { name: 'Icons', path: '/icons' }
  ];
</script>

<ModeWatcher darkClassNames={['dark']} lightClassNames={['light']} />

<div class="wrap">
  <nav>
    <ul>
      {#each routes as route}
        <li>
          <a href={route.path}>{route.name}</a>
        </li>
      {/each}
    </ul>

    <Button onclick={toggleMode}>Toggle Mode</Button>
  </nav>
  <main>
    {@render children()}
  </main>
</div>

<style>
  .wrap {
    display: flex;
    min-height: 100vh;
    gap: var(--size-4);
  }
  nav {
    width: 200px;
    background: var(--bg);
    padding: var(--size-4);
    border-right: var(--border-1);
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
      color: var(--red-5);
    }
  }
</style>
