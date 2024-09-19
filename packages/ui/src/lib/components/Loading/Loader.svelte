<div class="loader"></div>

<style>
  .loader {
    width: 10px;
    height: 10px;
    --c: no-repeat linear-gradient(var(--primary-500) 0 0);
    background: var(--c), var(--c), var(--c), var(--c);
    background-size: 6px 6px;
    animation: l5 1.5s infinite cubic-bezier(0.3, 1, 0, 1);
  }
  @keyframes l5 {
    0% {
      background-position:
        0 0,
        100% 0,
        100% 100%,
        0 100%;
    }
    33% {
      background-position:
        0 0,
        100% 0,
        100% 100%,
        0 100%;
      width: 15px;
      height: 15px;
    }
    66% {
      background-position:
        100% 0,
        100% 100%,
        0 100%,
        0 0;
      width: 15px;
      height: 15px;
    }
    100% {
      background-position:
        100% 0,
        100% 100%,
        0 100%,
        0 0;
    }
  }
</style>
