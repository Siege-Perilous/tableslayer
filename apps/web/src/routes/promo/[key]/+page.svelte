<script lang="ts">
  import { Button, Title, Panel, Spacer, Text } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  let selectedPartyId = $state('');
  let isSubmitting = $state(false);
</script>

<Head title="Redeem Promo" description="Redeem your promotional code for a lifetime party upgrade" />

<div class="promo-container">
  <Panel>
    {#if data.error}
      <Title as="h1" size="lg">Promo Not Available</Title>
      <Spacer />
      <div class="error-message">
        <Text>{data.error}</Text>
      </div>
      <Spacer />
      <Button href="/">Go to Dashboard</Button>
    {:else if data.success || form?.success}
      <Title as="h1" size="lg">Promo Redeemed!</Title>
      <Spacer />
      <div class="success-message">
        <Text>{data.message || form?.message}</Text>
      </div>
      <Spacer />
      <Button href="/">Go to Dashboard</Button>
    {:else if data.allPartiesLifetime}
      <Title as="h1" size="lg">All Set!</Title>
      <Spacer />
      <div class="info-message">
        <Text>All your parties are already on lifetime plans!</Text>
      </div>
      <Spacer />
      <Button href="/">Go to Dashboard</Button>
    {:else if data.parties && data.parties.length > 0}
      <Title as="h1" size="lg">Redeem Promo Code</Title>
      <Spacer />
      <Text>
        You're about to redeem the promo code <strong>{data.promo?.key}</strong>
        to upgrade one of your parties to a lifetime plan.
      </Text>
      <Spacer />

      {#if data.parties.length === 1}
        <Text>
          Your party <strong>{data.parties[0].name}</strong>
          will be upgraded to a lifetime plan.
        </Text>
      {:else}
        <Text>Please select which party you'd like to upgrade:</Text>
        <Spacer />

        <form
          method="POST"
          action="?/redeem"
          use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              await update();
              isSubmitting = false;
            };
          }}
        >
          <div class="party-options">
            {#each data.parties as party}
              <label class="party-option">
                <input type="radio" name="partyId" value={party.id} bind:group={selectedPartyId} />
                <div class="party-info">
                  <Text>{party.name}</Text>
                  <Text size="sm" style="color: var(--color-text-muted); margin-top: 0.25rem;">
                    Current plan: {party.plan}
                  </Text>
                </div>
              </label>
            {/each}
          </div>

          <Spacer />

          <Button type="submit" disabled={!selectedPartyId || isSubmitting} isLoading={isSubmitting}>
            Upgrade Selected Party
          </Button>
        </form>
      {/if}

      {#if form?.error}
        <Spacer />
        <div class="error-message">
          <Text>{form.error}</Text>
        </div>
      {/if}
    {:else}
      <Title as="h1" size="lg">No Eligible Parties</Title>
      <Spacer />
      <div class="info-message">
        <Text>No eligible parties to upgrade.</Text>
      </div>
      <Spacer />
      <Button href="/">Go to Dashboard</Button>
    {/if}
  </Panel>
</div>

<style>
  .promo-container {
    max-width: 600px;
    margin: 4rem auto;
    padding: 0 1rem;
  }

  .error-message {
    padding: 1rem;
    background-color: var(--color-danger-bg);
    color: var(--color-danger);
    border-radius: 0.5rem;
  }

  .success-message {
    padding: 1rem;
    background-color: var(--color-success-bg);
    color: var(--color-success);
    border-radius: 0.5rem;
  }

  .info-message {
    padding: 1rem;
    background-color: var(--color-info-bg);
    color: var(--color-info);
    border-radius: 0.5rem;
  }

  .party-option {
    display: flex;
    align-items: center;
    padding: 1rem;
    margin-bottom: 0.5rem;
    border: 1px solid var(--contrastMedium);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .party-option:hover {
    background-color: var(--contrastLow);
  }

  .party-option input[type='radio'] {
    margin-right: 1rem;
  }

  .party-info {
    flex: 1;
  }

  @media (max-width: 768px) {
    .promo-container {
      margin: 2rem auto;
    }
  }
</style>
