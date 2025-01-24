<script lang="ts">
  let { ...restProps } = $props();
  let loaderClasses = $derived(['loader', restProps.class ?? '']);
</script>

<div class={loaderClasses}>
  <div class="loader__anim"></div>
</div>

<style>
  .loader {
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .loader__anim {
    width: 8px;
    height: 8px;
    --c: no-repeat linear-gradient(var(--primary-500) 0 0);
    background: var(--c), var(--c), var(--c), var(--c);
    background-size: 5px 5px;
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
      width: 14px;
      height: 14px;
    }
    66% {
      background-position:
        100% 0,
        100% 100%,
        0 100%,
        0 0;
      width: 14px;
      height: 14px;
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
