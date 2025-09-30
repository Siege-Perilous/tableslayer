<script lang="ts">
  let m = $state({ x: 0, y: 0 });
  import { fade } from 'svelte/transition';

  let { bucketUrl }: { bucketUrl: string } = $props();

  const handleMousemove = (event: MouseEvent) => {
    m.x = event.clientX;
    m.y = event.clientY;
  };
  const parallaxFactor = 0.01; // Adjust for a subtle effect
  let fg = $state<HTMLDivElement | null>(null);
  let bg = $state<HTMLDivElement | null>(null);
  let cloudElements = $state<(HTMLDivElement | null)[]>(Array(7).fill(null));

  let showBg = $state(false);
  let showFg = $state(false);
  let showClouds = $state(Array(7).fill(false));

  $effect(() => {
    //  const applyParallax = (element: HTMLDivElement, factor: number) => {
    //  element.style.marginTop = `${m.y * factor}px`;
    //  };

    if (bg) bg.style.transform = `translate(${m.x * parallaxFactor * 0.5}px, ${m.y * parallaxFactor * 0.5}px)`;
    if (fg) fg.style.transform = `translate(${m.x * parallaxFactor}px, ${m.y * parallaxFactor}px)`;

    //  cloudElements.forEach((cloud, i) => {
    //  if (cloud) {
    //  applyParallax(cloud, parallaxFactor * (1 - i * Math.random() * 0.1));
    //  }
    //  });
  });

  $effect(() => {
    setTimeout(() => (showBg = true), 100); // Background
    setTimeout(() => (showFg = true), 400); // Foreground
    showClouds.forEach((_, i) => {
      setTimeout(() => (showClouds[i] = true), 700 + i * 200); // Cloud sequence
    });
  });
</script>

<svelte:window onmousemove={handleMousemove} />

{#if showBg}
  <div
    class="signup__bg"
    bind:this={bg}
    style="--bg-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/signup/bg-trans.png')"
    transition:fade={{ duration: 1000 }}
  ></div>
{/if}

{#if showFg}
  <div
    class="signup__fg"
    bind:this={fg}
    style="--fg-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/signup/fg-solid.png')"
    transition:fade={{ duration: 1000 }}
  ></div>
{/if}
{#each showClouds as show, i}
  {#if show}
    <div
      class={`cloud cloud${i + 1}`}
      bind:this={cloudElements[i]}
      style={`background-image: url('${bucketUrl}/cdn-cgi/image/w=300/illustrations/signup/c${i + 1}.png')`}
      transition:fade={{ duration: 800 }}
    ></div>
  {/if}
{/each}

<style>
  :global(.light .cloud) {
    filter: contrast(0.7) !important;
  }
  :global(.light .signup__bg) {
    opacity: 0.1 !important;
  }
  .cloud {
    position: fixed;
    z-index: 0;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: 15%;
    background-position: 0 0;
    background-repeat: no-repeat;
    animation: cloud 60s linear infinite;
    filter: brightness(0.25);
    z-index: 2;
    transform-style: preserve-3d;
    animation-timing-function: linear;
    transform: var(--parallax-translate-y, translateY(0)) translateX(-10%);
  }
  .cloud1 {
    background-position: top 10% left 0;
    animation-duration: 120s;
    animation-delay: -5s;
  }
  .cloud2 {
    background-position: top 50% left 0;
    animation-duration: 100s;
    animation-delay: -30s;
  }
  .cloud3 {
    background-position: top 60% left 0;
    animation-duration: 80s;
    animation-delay: -60s;
  }
  .cloud4 {
    background-position: top 5% left 0;
    animation-duration: 70s;
    background-size: 12%;
    animation-delay: -18s;
  }
  .cloud5 {
    background-position: top 24% left 0;
    animation-duration: 90s;
    animation-delay: -40s;
  }
  .cloud6 {
    background-position: top 80% left 0;
    animation-duration: 60s;
    animation-delay: -30s;
  }
  .cloud7 {
    background-position: top 35% left 0;
    animation-duration: 75s;
    animation-delay: -10s;
  }
  .signup__bg {
    top: 0;
    left: 0;
    right: 0;
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 0;
    margin-left: -50px;
    content: '';
    background-image: var(--bg-image);
    background-position: bottom -200px left -200px;
    background-size: 100%;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
    inset: 0;
    opacity: 1;
  }
  .signup__fg {
    top: 0;
    left: 0;
    right: 0;
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 3;
    content: '';
    background-image: var(--fg-image);
    background-position: bottom -100px right -100px;
    background-size: 75%;
    background-repeat: no-repeat;
    width: 100%;
    height: 100%;
    inset: 0;
  }
  @keyframes cloud {
    0% {
      transform: translateX(-10%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @media (min-width: 1920px) {
    .signup__fg {
      background-size: 65%;
    }
    .signup__bg {
      background-size: 90%;
    }
  }

  @media (max-width: 1200px) {
    .signup__fg {
      background-size: 85%;
    }
  }

  @media (max-width: 1000px) {
    .signup__fg {
      background-size: 100%;
    }
  }

  @media (max-width: 768px) {
    .signup__fg {
      display: none;
    }
  }
</style>
