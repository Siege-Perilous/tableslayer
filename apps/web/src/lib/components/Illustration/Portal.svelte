<script lang="ts">
  let m = $state({ x: 0, y: 0 });
  import { fade } from 'svelte/transition';

  const handleMousemove = (event: MouseEvent) => {
    m.x = event.clientX;
    m.y = event.clientY;
  };
  const parallaxFactor = 0.01; // Adjust for a subtle effect
  let fg = $state<HTMLDivElement | null>(null);
  let bg = $state<HTMLDivElement | null>(null);
  let mage = $state<HTMLDivElement | null>(null);

  let showBg = $state(false);
  let showFg = $state(false);

  $effect(() => {
    if (bg) bg.style.transform = `translate(${m.x * parallaxFactor}px, ${m.y * parallaxFactor}px)`;
    if (fg) fg.style.transform = `translate(${m.x * parallaxFactor * 0.5}px, ${m.y * parallaxFactor * 0.5}px)`;
  });

  $effect(() => {
    setTimeout(() => (showBg = true), 100); // Background
    setTimeout(() => (showFg = true), 400); // Foreground
  });
</script>

<svelte:window onmousemove={handleMousemove} />
{#if showBg}
  <div class="portal__bg" bind:this={bg} transition:fade={{ duration: 1000 }}></div>
{/if}

{#if showFg}
  <div class="portal__fg" bind:this={fg} transition:fade={{ duration: 1000 }}></div>
{/if}

<div class="portal__mage" bind:this={mage} transition:fade={{ duration: 1000 }}></div>

<style>
  :global(.light .portal__bg) {
    filter: none !important;
    background-blend-mode: normal !important;
    opacity: 0.2 !important;
  }
  .portal__bg {
    left: 0;
    top: -100px !important;
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 0;
    content: '';
    background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=2000/illustrations/portal/bg.png');
    background-position: bottom -50px left 0px;
    background-size: 100%;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
    opacity: 1;
    filter: brightness(0.25);
  }
  .portal__fg {
    top: 0;
    left: 0;
    right: 0;
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 3;
    content: '';
    background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=2000/illustrations/portal/portal.png');
    background-position: bottom 0px right 0px;
    background-size: 100%;
    background-repeat: no-repeat;
    width: 100%;
    height: 100%;
  }
  .portal__mage {
    left: 37%;
    bottom: 5%;
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 5;
    content: '';
    background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=2000/illustrations/portal/mage.png');
    background-position: bottom -50px left 0px;
    background-size: 25%;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
  }

  @media (min-width: 1920px) {
    .portal__fg {
      background-size: 65%;
    }
    .portal__bg {
      background-size: 90%;
    }
  }

  @media (max-width: 1200px) {
    .portal__fg {
      background-size: 85%;
    }
  }

  @media (max-width: 1000px) {
    .portal__fg {
      background-size: 100%;
    }
  }

  @media (max-width: 768px) {
    .portal__fg {
      display: none;
    }
  }
</style>
