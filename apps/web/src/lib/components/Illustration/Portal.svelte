<script lang="ts">
  let { showPortal, bucketUrl = 'https://files.tableslayer.com' }: { showPortal: boolean; bucketUrl?: string } =
    $props();
  let m = $state({ x: 0, y: 0 });
  import { fly, scale } from 'svelte/transition';

  const handleMousemove = (event: MouseEvent) => {
    m.x = event.clientX;
    m.y = event.clientY;
  };
  const parallaxFactor = 0.01; // Adjust for a subtle effect
  let fg = $state<HTMLDivElement | null>(null);
  let bg = $state<HTMLDivElement | null>(null);
  let portal = $state<HTMLDivElement | null>(null);
  let mage = $state<HTMLDivElement | null>(null);

  let showFg = $state(false);
  let showBg = $state(false);
  let showMage = $state(false);

  $effect(() => {
    if (bg) bg.style.transform = `translate(${m.x * parallaxFactor}px, ${m.y * parallaxFactor}px)`;
    if (fg) fg.style.transform = `translate(${m.x * parallaxFactor * 0.5}px, ${m.y * parallaxFactor * 0.5}px)`;
    if (portal)
      portal.style.transform = `translate(calc(${m.x * parallaxFactor * 0.2}px -45%), calc(${m.y * parallaxFactor * 0.2}px) -60%)`;
  });

  $effect(() => {
    setTimeout(() => (showFg = true), 100);
    setTimeout(() => (showBg = true), 400);
    setTimeout(() => (showMage = true), 700);
  });
</script>

<svelte:window onmousemove={handleMousemove} />
{#if showPortal}
  <div
    class="portal-frame"
    bind:this={portal}
    style="--portal-effect-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/portal/effect.png')"
    transition:scale={{ duration: 500, start: 0.1 }}
  >
    <div class="portal"></div>
  </div>
{/if}
{#if showBg}
  <div
    class="portal__bg"
    bind:this={bg}
    style="--bg-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/portal/bg.png')"
    transition:fly={{ y: '20%', duration: 1000 }}
  ></div>
{/if}

{#if showFg}
  <div
    class="portal__fg"
    bind:this={fg}
    style="--portal-bg-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/portal/portal.png')"
    transition:fly={{ y: '20%', duration: 1000 }}
  ></div>
{/if}

{#if showMage}
  <div
    class="portal__mage"
    bind:this={mage}
    style="--mage-image: url('{bucketUrl}/cdn-cgi/image/w=2000/illustrations/portal/mage.png')"
    transition:fly={{ x: '-10%', duration: 500 }}
  ></div>
{/if}

<style>
  :global(.light) {
    .portal__bg {
      filter: none !important;
      opacity: 0.6 !important;
    }
    .portal__fg {
      filter: drop-shadow(0px 0px 10px #fff);
    }
    .portal:before {
      background: linear-gradient(white -25%, black 50%, white 125%), var(--portal-color);
      opacity: 0.8;
    }
  }
  .portal__bg {
    left: 0%;
    top: -100px !important;
    position: fixed;
    width: calc(100% + 50px);
    margin-left: -50px;
    height: 100%;
    z-index: 0;
    content: '';
    background-image: var(--bg-image);
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
    width: calc(100% + 50px);
    margin-left: -50px;
    height: 100%;
    z-index: 3;
    content: '';
    background-image: var(--portal-bg-image);
    background-position: bottom 0px right 0px;
    background-size: 100%;
    background-repeat: no-repeat;
    filter: drop-shadow(0px 0px 20px #000);
  }
  .portal__mage {
    left: 37%;
    bottom: 5%;
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 5;
    content: '';
    background-image: var(--mage-image);
    background-position: bottom -50px left 0px;
    background-size: 25%;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
  }
  /* Portal effect from https://codepen.io/propjockey/pen/vYxraBz */
  @keyframes portal-spin {
    0% {
      transform: rotate(359deg);
    }
  }
  .portal-frame {
    --portal-color: #fff;
    position: fixed;
    left: 50%;
    width: 30%;
    bottom: 0;
    aspect-ratio: 1;
    --portal-browserbugfix: perspective(2077px) translateZ(-0.1px);
    transform: var(--portal-browserbugfix) scaleX(1) translateX(-45%) translateY(-60%);
    filter: contrast(3);
    overflow: hidden;
    z-index: 2;
    opacity: 0.5;
  }
  .portal,
  .portal::before {
    position: absolute;
    inset: 0;
    animation: portal-spin 7s infinite linear;
  }
  .portal {
    --portal-img: var(--portal-effect-image);
    --portal-mask: var(--portal-img) top left / 100% 100% no-repeat;
    -webkit-mask: var(--portal-mask);
    mask: var(--portal-mask);
  }
  .portal::before {
    content: '';
    animation-direction: reverse;
    background: linear-gradient(black -25%, transparent 50%, black 125%), var(--portal-color);
  }
</style>
