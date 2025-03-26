<script lang="ts">
  import { PartyPlanSelector } from './';
  import type { SelectParty } from '$lib/db/app/schema';
  import { useStripeCustomerPortal } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { Button, Text, Spacer, Panel, Link } from '@tableslayer/ui';
  let { party, limitText = 'Your party is limited' }: { party: SelectParty; limitText?: string } = $props();
  let formIsLoading = $state(false);

  const portal = useStripeCustomerPortal();

  const handleCustomerPortal = async () => {
    if (party.stripeCustomerId === null) return;

    await handleMutation({
      mutation: () => $portal.mutateAsync({ partyId: party.id as string }),
      toastMessages: {
        error: { title: 'Error', body: (error) => error.message }
      },
      formLoadingState: (loading) => {
        formIsLoading = loading;
      },
      onSuccess: (result) => {
        if (result.url) {
          console.log(result.url);
          window.location.href = result.url;
        }
      }
    });
  };

  const formatDate = (date: Date) => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return formatter.format(date).replace(',', '');
  };
</script>

<Panel class="partyUpgrade">
  {#if party.plan !== 'free'}
    <Text weight={800}>
      Your party is on a <span class="partyUpgrade__highlight">{party.plan} plan</span>
      .
    </Text>
    <Spacer size={2} />
    <Text color="var(--fgMuted)" size={'0.875rem'}>
      Thank you for supporting Table Slayer. If you run into problems or have ideas, please contact
      <Link href="mailto:dave@tableslayer.com">dave@tableslayer.com</Link>.
    </Text>
    {#if party.plan !== 'lifetime'}
      <Spacer />
      {#if party.planExpirationDate}
        <Text size="0.875rem" color="var(--fgDanger)">
          Your plan expires on {formatDate(party.planExpirationDate)}.
        </Text>
      {:else if party.planNextBillingDate}
        <Text size="0.875rem">Your plan renews on {formatDate(party.planNextBillingDate)}.</Text>
      {/if}
      <Spacer />
      <Button onclick={() => handleCustomerPortal()} class="partyUpgrade__manage" isLoading={formIsLoading}>
        Manage subscription
      </Button>
    {/if}
  {:else}
    <Text weight={800}>{limitText}</Text>
    <Spacer size={2} />
    <Text color="var(--fgMuted)" size={'0.875rem'}>
      Unlock <span class="partyUpgrade__highlight">unlimited sessions and scenes</span>
      with an upgraded party. Table Slayer is open source and free to <Link
        href="https://github.com/siege-perilous/tableslayer"
      >
        host on your own
      </Link>.
    </Text>
    <Spacer />
    <PartyPlanSelector {party} />
  {/if}
</Panel>

<style>
  :global {
    .panel.partyUpgrade {
      padding: 1rem;
      gap: 0.5rem;
    }
    .btn.partyUpgrade__manage {
      width: 100%;
    }
  }
  .partyUpgrade__highlight {
    font-weight: 800;
    color: var(--fg);
    text-decoration: underline;
    text-decoration-style: dashed;
  }
</style>
