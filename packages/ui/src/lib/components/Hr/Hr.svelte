<script lang="ts">
  let { ...restProps } = $props();

  let hrClasses = $derived(['hr', restProps.class ?? '']);
</script>

<hr class={hrClasses} {...restProps} />

<style>
  .hr {
    min-height: 1px;
    height: 1px;
    width: 100%;
    background: var(--contrastMedium);
  }
</style>
