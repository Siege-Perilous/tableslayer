<!-- I removed conxtext="module" from the script tag, it might be important -->
<script lang="ts">
  let { children } = $props();
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/queryClient';
  import '@tableslayer/ui/styles/globals.css';
  import { ModeWatcher } from 'mode-watcher';
  import { GlobalLoading } from '$lib/components';
  import { Toast } from '@tableslayer/ui';
</script>

<QueryClientProvider client={queryClient}>
  <ModeWatcher darkClassNames={['dark']} lightClassNames={['light']} />
  <GlobalLoading />
  <div class="children">
    {@render children()}
  </div>
  <!--  <div class="grid"></div>  -->
</QueryClientProvider>

<Toast />

<style>
  :global(body) {
    background: var(--bg);
  }
  /*  .grid {  */
  /*  pointer-events: none;  */
  /*  position: fixed;  */
  /*  inset: 0;  */
  /*  height: 100%;  */
  /*  width: 100%;  */
  /*  background-image: linear-gradient(to right, #80808012 1px, transparent 1px),  */
  /*  linear-gradient(to bottom, #80808012 1px, transparent 1px);  */
  /*  background-size: 28px 28px;  */
  /*  -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, transparent 100%);  */
  /*  mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, transparent 100%);  */
  /*  }  */
  .children {
    position: relative;
    z-index: 1;
  }
</style>
