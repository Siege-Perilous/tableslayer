<script lang="ts">
  import { Button, Avatar, Title, Panel, Spacer, Text, Link } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  let selectedPartyId = $state('');
  let isSubmitting = $state(false);
</script>

<Head title="Redeem Promo" description="Redeem your promotional code for a lifetime party upgrade" />

<div class="promo">
  <Panel class="promo__panel">
    <img src="https://files.tableslayer.com/illustrations/promo/promo.png" alt="Promos" height="396" width="562" />
    <div class="promo__content">
      {#if data.error}
        <Title as="h1" size="sm">Promo claimed</Title>
        <Spacer />
        <Text>
          {data.error}. If you think this is in error, please <Link href="mailto:dave@tableslayer.com">
            contact us
          </Link>.
        </Text>
      {:else if data.success || form?.success}
        <Title as="h1" size="sm">Promo redeemed!</Title>
        <Spacer />
        <Text>{data.message || form?.message}</Text>
      {:else if data.allPartiesLifetime}
        <Title as="h1" size="sm">All set!</Title>
        <Spacer />
        <Text>All your parties are already on lifetime plans!</Text>
      {:else if data.parties && data.parties.length > 0}
        <Title as="h1" size="sm">Redeem promo code</Title>
        <Spacer />
        <Text>
          This promotional code will upgrade one of your parties to a lifetime plan. Thanks for being a friend of Table
          Slayer!
        </Text>
        <Spacer />

        {#if data.parties.length === 1}
          <Text>
            Your party <strong>{data.parties[0].name}</strong>
            will be upgraded to a lifetime plan.
          </Text>
        {:else}
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
            <div class="promo__parties">
              {#each data.parties as party}
                <label class="promo__party {selectedPartyId === party.id ? 'promo__party--selected' : ''}">
                  <Avatar variant="square" src={party.thumb.resizedUrl || party.thumb.url} alt={party.name} size="md" />
                  <div class="promo__partyInfo">
                    <Text>{party.name}</Text>
                    <Text
                      size="0.875rem"
                      color="var(--fgMuted)"
                      style="color: var(--color-text-muted); margin-top: 0.25rem;"
                    >
                      Current plan: {party.plan}
                    </Text>
                  </div>
                  <input
                    class="promo__radio"
                    type="radio"
                    name="partyId"
                    value={party.id}
                    bind:group={selectedPartyId}
                  />
                </label>
              {/each}
            </div>

            {#if selectedPartyId}
              <Spacer />

              <Button
                variant="special"
                size="lg"
                type="submit"
                disabled={!selectedPartyId || isSubmitting}
                isLoading={isSubmitting}
              >
                Upgrade selected party
              </Button>
            {/if}
          </form>
        {/if}

        {#if form?.error}
          <Spacer />
          <Text color="var(--fgDanger)">{form.error}</Text>
        {/if}
      {:else}
        <Title as="h1" size="lg">No eligible parties</Title>
        <Spacer />
        <div class="promo__message promo__message--info">
          <Text>No eligible parties to upgrade.</Text>
        </div>
        <Spacer />
        <Button href="/">Go to dashboard</Button>
      {/if}
    </div>
  </Panel>
</div>

<style>
  .promo {
    max-width: 1000px;
    height: 100vh;
    display: flex;
    align-items: center;
    margin: auto;
  }

  :global(.promo__panel) {
    display: grid;
    grid-template-columns: 562px 1fr;
    align-items: center;
    gap: 1rem;
  }

  .promo__message {
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .promo__message--info {
    background-color: var(--color-info-bg);
    color: var(--color-info);
  }

  .promo__party {
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    border: var(--borderThick);
    border-color: transparent;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .promo__party:hover {
    border-color: var(--fgPrimary);
    background-color: var(--contrastLow);
  }

  .promo__party--selected {
    border-color: var(--fgPrimary);
  }

  .promo__party--selected:hover {
    border-color: var(--fgPrimary);
  }

  .promo__radio {
    margin-right: 1rem;
  }

  .promo__partyInfo {
    flex: 1;
    margin-left: 1rem;
  }
  .promo__content {
    padding: 1rem;
  }

  .promo__parties {
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 1rem;
    &:after {
      position: sticky;
      bottom: 0;
      content: '';
      display: block;
      height: 1rem;
      background: linear-gradient(to bottom, transparent, var(--contrastLowest));
    }
  }

  @media (max-width: 768px) {
    .promo {
      margin: 2rem auto;
    }

    :global(.promo__panel) {
      grid-template-columns: 1fr;
    }
  }
</style>
