<script lang="ts">
  import type { CardFanProps } from './types';
  let { images, height = '120px', ...restProps }: CardFanProps = $props();
  const cardFanClasses = $derived(['cardFan', `cardFan--count-${images.length}`, restProps.class ?? '']);
</script>

<div {...restProps} class={cardFanClasses} style="--cardFanHeight: {height}">
  {#each images as image}
    <div class="cardFan__card">
      <div class="cardFan__cardImage" style="background-image: url({image});"></div>
    </div>
  {/each}
</div>

<style>
  .cardFan {
    position: relative;
    height: calc(var(--cardFanHeight) * 1.3);
    width: calc(var(--cardFanHeight) * 2);
  }

  .cardFan__card {
    background: var(--bg);
    height: var(--cardFanHeight);
    width: calc(var(--cardFanHeight) * 0.6818);
    border-radius: 0.25rem;
    position: absolute;
    box-shadow:
      0 0 0.5rem rgba(0, 0, 0, 0.2),
      1px 1px 32px 4px rgba(0, 0, 0, 0.76) inset;
    left: 50%;
    top: 50%;
    transform-origin: center 120%;
    border: var(--borderThick);
    border-color: var(--fg);
    transition: transform 0.2s var(--ease-in-2);
    overflow: hidden;
  }

  .cardFan__cardImage {
    position: absolute;
    width: var(--cardFanHeight);
    height: calc(var(--cardFanHeight) * 0.6818);
    background-size: cover;
    background-position: center center;
    transform: rotate(-90deg);
    transform-origin: center center;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
  }

  .cardFan__card:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: var(--radius-2);
    border: solid var(--bg) 0.3rem;
    z-index: 1;
  }

  .cardFan--count-1 .cardFan__card:nth-child(1) {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  .cardFan--count-2 .cardFan__card:nth-child(1) {
    transform: translate(-50%, -50%) rotate(-10deg);
  }
  .cardFan--count-2 .cardFan__card:nth-child(2) {
    transform: translate(-50%, -50%) rotate(10deg);
  }

  .cardFan--count-3 .cardFan__card:nth-child(1) {
    transform: translate(-50%, -50%) rotate(-15deg);
  }
  .cardFan--count-3 .cardFan__card:nth-child(2) {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  .cardFan--count-3 .cardFan__card:nth-child(3) {
    transform: translate(-50%, -50%) rotate(15deg);
  }

  .cardFan--count-4 .cardFan__card:nth-child(1) {
    transform: translate(-50%, -50%) rotate(-20deg);
  }
  .cardFan--count-4 .cardFan__card:nth-child(2) {
    transform: translate(-50%, -50%) rotate(-7deg);
  }
  .cardFan--count-4 .cardFan__card:nth-child(3) {
    transform: translate(-50%, -50%) rotate(7deg);
  }
  .cardFan--count-4 .cardFan__card:nth-child(4) {
    transform: translate(-50%, -50%) rotate(20deg);
  }

  .cardFan--count-5 .cardFan__card:nth-child(1) {
    transform: translate(-50%, -50%) rotate(-25deg);
  }
  .cardFan--count-5 .cardFan__card:nth-child(2) {
    transform: translate(-50%, -50%) rotate(-12.5deg);
  }
  .cardFan--count-5 .cardFan__card:nth-child(3) {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  .cardFan--count-5 .cardFan__card:nth-child(4) {
    transform: translate(-50%, -50%) rotate(12.5deg);
  }
  .cardFan--count-5 .cardFan__card:nth-child(5) {
    transform: translate(-50%, -50%) rotate(25deg);
  }

  :global {
    *:hover > .cardFan--count-1 .cardFan__card:nth-child(1) {
      transform: translate(-50%, -50%) rotate(0deg) !important;
    }

    *:hover > .cardFan--count-2 .cardFan__card:nth-child(1) {
      transform: translate(-120%, -42%) rotate(-10deg) !important;
    }
    *:hover > .cardFan--count-2 .cardFan__card:nth-child(2) {
      transform: translate(20%, -42%) rotate(10deg) !important;
    }

    *:hover > .cardFan--count-3 .cardFan__card:nth-child(1) {
      transform: translate(-130%, -45%) rotate(-10deg) !important;
    }
    *:hover > .cardFan--count-3 .cardFan__card:nth-child(2) {
      transform: translate(-50%, -50%) rotate(0deg) !important;
    }
    *:hover > .cardFan--count-3 .cardFan__card:nth-child(3) {
      transform: translate(30%, -45%) rotate(10deg) !important;
    }

    *:hover > .cardFan--count-4 .cardFan__card:nth-child(1) {
      transform: translate(-140%, -42%) rotate(-10deg) !important;
    }
    *:hover > .cardFan--count-4 .cardFan__card:nth-child(2) {
      transform: translate(-70%, -46%) rotate(-5deg) !important;
    }
    *:hover > .cardFan--count-4 .cardFan__card:nth-child(3) {
      transform: translate(-10%, -46%) rotate(5deg) !important;
    }
    *:hover > .cardFan--count-4 .cardFan__card:nth-child(4) {
      transform: translate(60%, -42%) rotate(10deg) !important;
    }
    *:hover > .cardFan--count-5 .cardFan__card:nth-child(1) {
      transform: translate(-150%, -42%) rotate(-10deg) !important;
    }
    *:hover > .cardFan--count-5 .cardFan__card:nth-child(2) {
      transform: translate(-100%, -46%) rotate(-5deg) !important;
    }
    *:hover > .cardFan--count-5 .cardFan__card:nth-child(3) {
      transform: translate(-50%, -50%) rotate(0deg) !important;
    }
    *:hover > .cardFan--count-5 .cardFan__card:nth-child(4) {
      transform: translate(0%, -46%) rotate(5deg) !important;
    }
    *:hover > .cardFan--count-5 .cardFan__card:nth-child(5) {
      transform: translate(50%, -42%) rotate(10deg) !important;
    }
  }
</style>
