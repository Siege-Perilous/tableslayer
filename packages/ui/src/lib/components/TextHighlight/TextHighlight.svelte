<script lang="ts">
  import IconWrapper from '../Icon/Icon.svelte';

  type Props = {
    text: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon?: any;
  };

  let { text, icon }: Props = $props();
</script>

<span class="textHighlight">
  {#if icon}
    <IconWrapper Icon={icon} size="0.875em" class="textHighlight__icon" />
  {/if}
  <span class="textHighlight__text">{text}</span>
</span>

<style>
  .textHighlight {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    font-family: var(--font-mono);
    font-size: 0.95em;
    padding: 0.1em 0.35em;
    color: var(--fg);
    background-color: var(--contrastLowest);
    border: var(--borderThin);
    border-color: var(--contrastEmpty);
    border-radius: var(--radius-1);
    vertical-align: baseline;
  }

  .textHighlight__text {
    line-height: 1.2;
  }

  :global(.textHighlight__icon) {
    color: var(--fg);
    flex-shrink: 0;
  }
</style>
