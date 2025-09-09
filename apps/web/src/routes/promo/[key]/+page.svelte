<script lang="ts">
  import { Button, Avatar, Title, Panel, Spacer, Text, Link } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { useRedeemPromoMutation } from '$lib/queries/admin';
  import { handleMutation, type FormMutationError } from '$lib/factories';

  let { data } = $props();

  let selectedPartyId = $state('');
  let isSubmitting = $state(false);
  let redeemError = $state<FormMutationError | undefined>(undefined);

  const redeemPromo = useRedeemPromoMutation();

  // Pre-select the party if there's only one
  $effect(() => {
    if (data.parties && data.parties.length === 1) {
      selectedPartyId = data.parties[0].id;
    }
  });

  const handleRedeemPromo = async (e: Event) => {
    e.preventDefault();

    await handleMutation({
      mutation: () =>
        $redeemPromo.mutateAsync({
          key: data.params?.key || '',
          partyId: selectedPartyId
        }),
      formLoadingState: (loading) => (isSubmitting = loading),
      onError: (error) => (redeemError = error),
      toastMessages: {
        success: { title: 'Party upgraded to lifetime plan!' },
        error: { title: 'Error redeeming promo', body: (error) => error.message }
      }
    });
  };
</script>

<Head title="Redeem Promo" description="Redeem your promotional code for a lifetime party upgrade" />

<div class="promo">
  <Panel class="promo__panel">
    <img src="https://files.tableslayer.com/illustrations/promo/promo.png" alt="Promos" />
    <div class="promo__content">
      {#if data.error}
        <Title as="h1" size="sm">Promo claimed</Title>
        <Spacer />
        <Text>
          {data.error}. If you think this is in error, please <Link href="mailto:dave@tableslayer.com">
            contact us
          </Link>.
        </Text>
      {:else if data.allPartiesLifetime}
        <Title as="h1" size="sm">All set!</Title>
        <Spacer />
        <Text>All your parties are already on lifetime plans!</Text>
      {:else if data.parties && data.parties.length > 0}
        <Title as="h1" size="sm">Redeem promo code</Title>
        <Spacer />
        <Text>
          This promotional code will upgrade {data.parties.length > 1 ? 'one of your parties' : 'your party'} to a lifetime
          plan. Thanks for being a friend of Table Slayer!
        </Text>
        <Spacer />

        <form onsubmit={handleRedeemPromo}>
          <div class="promo__parties {data.parties.length === 1 ? 'promo__parties--single' : ''}">
            {#each data.parties as party}
              <label class="promo__party {selectedPartyId == party.id ? 'promo__party--selected' : ''}">
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
                <input class="promo__radio" type="radio" name="partyId" value={party.id} bind:group={selectedPartyId} />
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
              Upgrade party to lifetime plan
            </Button>
          {/if}
        </form>

        {#if redeemError}
          <Spacer />
          <Text color="var(--fgDanger)">{redeemError.message || 'Failed to redeem promo'}</Text>
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
  .promo__parties--single {
    .promo__party {
      border-color: transparent;
    }
    .promo__party:hover {
      border-color: transparent;
      background-color: transparent;
    }
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
    position: relative;
  }

  @media (max-width: 1000px) {
    .promo {
      margin: 2rem auto;
      max-width: 562px;
      margin: auto;
    }

    :global(.promo__panel) {
      grid-template-columns: 1fr;
    }
  }
</style>
