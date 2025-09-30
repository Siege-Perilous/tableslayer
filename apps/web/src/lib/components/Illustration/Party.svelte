<script lang="ts">
  let m = $state({ x: 0, y: 0 });
  import { fly } from 'svelte/transition';

  let { bucketUrl }: { bucketUrl: string } = $props();

  const handleMousemove = (event: MouseEvent) => {
    m.x = event.clientX;
    m.y = event.clientY;
  };
  const parallaxFactor = 0.01; // Adjust for a subtle effect
  let fg = $state<HTMLDivElement | null>(null);
  let bg = $state<HTMLDivElement | null>(null);
  let portal = $state<HTMLDivElement | null>(null);

  let showFg = $state(false);
  let showBg = $state(false);

  $effect(() => {
    if (bg) bg.style.transform = `translate(${m.x * parallaxFactor}px, ${m.y * parallaxFactor}px)`;
    if (fg) fg.style.transform = `translate(${m.x * parallaxFactor * 0.5}px, ${m.y * parallaxFactor * 0.5}px)`;
    if (portal)
      portal.style.transform = `translate(calc(${m.x * parallaxFactor * 0.2}px -45%), calc(${m.y * parallaxFactor * 0.2}px) -60%)`;
  });

  $effect(() => {
    setTimeout(() => (showFg = true), 100);
    setTimeout(() => (showBg = true), 400);
  });
</script>

<svelte:window onmousemove={handleMousemove} />
{#if showBg}
  <div
    class="party__bg"
    bind:this={bg}
    style="--bg-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/party/bg_light.png')"
    transition:fly={{ y: '20%', duration: 1000 }}
  ></div>
{/if}

{#if showFg}
  <div
    class="party__fg"
    bind:this={fg}
    style="--fg-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/party/party.png')"
    transition:fly={{ y: '20%', duration: 1000 }}
  ></div>
{/if}

<style>
  :global(.light) {
    .party__bg {
      filter: none !important;
      opacity: 0.6 !important;
    }
    .party__fg {
      filter: drop-shadow(0px 0px 10px #fff);
    }
  }
  .party__bg {
    left: 0%;
    top: -100px !important;
    position: fixed;
    width: calc(100dvw + 50px);
    margin-left: -50px;
    height: 100%;
    z-index: 0;
    content: '';
    background-image: var(--bg-image);
    background-position: top 100px left 0px;
    background-size: 100%;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
    opacity: 1;
    filter: brightness(0.2);
  }
  .party__fg {
    position: fixed;
    width: 100dvw;
    height: 100%;
    z-index: 3;
    content: '';
    background-image: var(--fg-image);
    background-position: 120% 25%;
    background-size: 80%;
    background-repeat: no-repeat;
  }

  @media (max-width: 768px) {
    .party__fg {
      display: none;
    }
  }
  /* Portal effect from https://codepen.io/propjockey/pen/vYxraBz */
  @keyframes portal-spin {
    0% {
      transform: rotate(359deg);
    }
  }
</style>
