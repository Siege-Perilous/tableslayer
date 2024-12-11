<script lang="ts">
  let m = $state({ x: 0, y: 0 });

  const handleMousemove = (event: MouseEvent) => {
    m.x = event.clientX;
    m.y = event.clientY;
  };
  const parallaxFactor = 0.01; // Adjust for a subtle effect
  let fg: HTMLDivElement;
  let bg: HTMLDivElement;
  let cloud1: HTMLDivElement;
  let cloud2: HTMLDivElement;
  let cloud3: HTMLDivElement;
  let cloud4: HTMLDivElement;
  let cloud5: HTMLDivElement;
  let cloud6: HTMLDivElement;
  let cloud7: HTMLDivElement;

  $effect(() => {
    const applyParallax = (element: HTMLDivElement, parallaxFactor: number) => {
      element.style.marginTop = `${m.y * parallaxFactor}px`;
    };
    bg.style.transform = `translate(${m.x * parallaxFactor}px, ${m.y * parallaxFactor}px)`;
    fg.style.transform = `translate(${m.x * parallaxFactor * 0.5}px, ${m.y * parallaxFactor * 0.5}px)`;
    applyParallax(cloud1, parallaxFactor * 1);
    applyParallax(cloud2, parallaxFactor * 0.9);
    applyParallax(cloud3, parallaxFactor * 0.8);
    applyParallax(cloud4, parallaxFactor * 0.6);
    applyParallax(cloud5, parallaxFactor * 0.7);
    applyParallax(cloud6, parallaxFactor * 0.6);
    applyParallax(cloud7, parallaxFactor * 0.5);
  });
</script>

<svelte:window onmousemove={handleMousemove} />

<div
  bind:this={cloud1}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c1.png')"
  class="cloud cloud1"
></div>
<div
  bind:this={cloud2}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c2.png')"
  class="cloud cloud2"
></div>
<div
  bind:this={cloud3}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c3.png')"
  class="cloud cloud3"
></div>
<div
  bind:this={cloud4}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c4.png')"
  class="cloud cloud4"
></div>
<div
  bind:this={cloud5}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c5.png')"
  class="cloud cloud5"
></div>
<div
  bind:this={cloud6}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c6.png')"
  class="cloud cloud6"
></div>
<div
  bind:this={cloud7}
  style="background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=300/illustrations/signup/c7.png')"
  class="cloud cloud7"
></div>
<div class="signup__fg" bind:this={fg}></div>
<div class="signup__bg" bind:this={bg}></div>

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
    content: '';
    background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=2000/illustrations/signup/bg-trans.png');
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
    background-image: url('https://files.tableslayer.com/cdn-cgi/image/w=2000/illustrations/signup/fg-solid.png');
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

  @media (max-width: 768px) {
    .signup__fg {
      display: none;
    }
  }
</style>
