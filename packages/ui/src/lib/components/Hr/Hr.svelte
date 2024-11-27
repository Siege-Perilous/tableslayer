<script lang="ts">
  import classNames from 'classnames';
  let { ...restProps } = $props();

  const hrClasses = classNames('hr', restProps.class ?? '');
</script>

<hr class={hrClasses} {...restProps} />

<style>
  .hr {
    height: 1px;
    width: 100%;
    background: var(--contrastMedium);
  }
</style>
