<script lang="ts">
  import { Text } from '@tableslayer/ui';

  let { reconnecting }: { reconnecting: boolean } = $props();
</script>

<div class="sleep" data-testid="playfieldSleepOverlay">
  <div class="sleep__card">
    {#if reconnecting}
      <Text size="1.25rem" class="sleep__title">Waking up</Text>
      <Text color="var(--fgMuted)" class="sleep__hint">Pulling the latest scene</Text>
    {:else}
      <Text size="1.25rem" class="sleep__title">Still playing?</Text>
      <Text color="var(--fgMuted)" class="sleep__hint">Make an edit, or touch this screen</Text>
    {/if}
  </div>
</div>

<style>
  .sleep {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 100;
  }
  .sleep__card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
    text-align: center;
    max-width: 24rem;
    padding: 1rem 1.5rem;
    background: black;
    color: var(--fg);
  }
</style>
