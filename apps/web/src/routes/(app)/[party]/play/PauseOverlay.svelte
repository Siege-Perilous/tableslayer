<script lang="ts">
  import { getRandomFantasyQuote } from '$lib/utils';
  import { Text, Title } from '@tableslayer/ui';

  let {
    hasActiveScene,
    pauseScreenUrl
  }: {
    hasActiveScene: boolean;
    pauseScreenUrl?: string;
  } = $props();

  // Mounted fresh each time the game pauses, so the quote rotates per pause
  const quote = getRandomFantasyQuote();
</script>

{#if pauseScreenUrl}
  <div
    class="paused paused--custom"
    data-testid="playfieldPauseScreen"
    style="background-image: url({pauseScreenUrl})"
  ></div>
{:else}
  <div class="paused" data-testid="playfieldPauseScreen">
    <div>
      <Title as="h1" size="lg" class="heroTitle">Table Slayer</Title>
      {#if !hasActiveScene}
        <Text size="1.5rem" color="var(--fgPrimary)" data-testid="playfieldWaitingMessage">
          Waiting for Game Master to set an active scene
        </Text>
      {:else}
        <Text size="1.5rem" color="var(--fgPrimary)" data-testid="playfieldPausedMessage">Game is paused</Text>
      {/if}
    </div>
    <div class="quote">
      <Text size="1.5rem">{quote.quote}</Text>
      <Text color="var(--fgMuted)">
        — {quote.author},
        <span>{quote.source}</span>
      </Text>
    </div>
  </div>
{/if}

<style>
  .paused {
    display: flex;
    gap: 4rem;
    width: 100dvw;
    height: 100dvh;
    align-items: center;
    justify-content: center;
  }
  .paused--custom {
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: black;
  }
  .quote {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: var(--contain-mobile);
    font-family: var(--font-mono);
    border-left: var(--borderThin);
    padding-left: 4rem;
  }
  .quote span {
    font-style: italic;
  }
</style>
