<script lang="ts">
  import type { SelectParty } from '$lib/db/app/schema';
  import { IconSelector } from '@tabler/icons-svelte';
  import { useStripeCheckout, useStripeCustomerPortal } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { type PartyPlan } from '$lib/db/app/schema';
  import { Button, Text, Spacer, Panel, Link, Popover, Hr, Icon, Loader } from '@tableslayer/ui';
  let { party, limitText = 'Your party is limited' }: { party: SelectParty; limitText?: string } = $props();

  const checkout = useStripeCheckout();
  const portal = useStripeCustomerPortal();
  let formIsLoading = $state(false);

  const handleUpgrade = async (plan: PartyPlan) => {
    await handleMutation({
      mutation: () => $checkout.mutateAsync({ partyId: party.id, plan }),
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
    <Text weight={800}>Your party is on a <span class="partyUpgrade__highlight">{party.plan} plan</span>.</Text>
    <Spacer size={2} />
    <Text color="var(--fgMuted)" size={'0.875rem'}>
      Thank you for supporting Table Slayer. If you run into problems or have ideas, please contact
      <Link href="mailto:dave@tableslayer.com">dave@tableslayer.com</Link>.
    </Text>
    {#if party.plan !== 'lifetime'}
      <Spacer />
      {#if party.planExpirationDate}
        <Text size="0.875rem" color="var(--fgDanger)">Your plan expires on {formatDate(party.planExpirationDate)}.</Text
        >
      {:else if party.planNextBillingDate}
        <Text size="0.875rem">Your plan renews on {formatDate(party.planNextBillingDate)}.</Text>
      {/if}
      <Spacer />
      <Button onclick={() => handleCustomerPortal()} class="partyUpgrade__manage">Manage subscription</Button>
    {/if}
  {:else}
    <Text weight={800}>{limitText}</Text>
    <Spacer size={2} />
    <Text color="var(--fgMuted)" size={'0.875rem'}>
      Unlock <span class="partyUpgrade__highlight">unlimited sessions and scenes</span> with an upgraded party. Table
      Slayer is open source and free to <Link href="https://github.com/siege-perlious/tableslayer"
        >host on your own</Link
      >.
    </Text>
    <Spacer />
    <Popover positioning={{ placement: 'bottom-start' }} class="partyUpgrade__popContent">
      {#snippet trigger()}
        <Button variant="special" class="partyUpgrade__btn" disabled={formIsLoading}>
          Upgrade your party
          {#snippet end()}
            {#if formIsLoading}
              <Loader />
            {:else}
              <Icon Icon={IconSelector} />
            {/if}
          {/snippet}
        </Button>
      {/snippet}
      {#snippet content()}
        <div class="partyUpgrade__popover">
          <Text weight={800}>Select a plan</Text>
          <Spacer size={2} />
          <Hr />
          <Spacer size={2} />
          <button onclick={() => handleUpgrade('monthly')} class="partyUpgrade__popBtn">
            <span>Monthly</span>
            <span class="partyUpgrade__price">$5</span>
          </button>
          <button onclick={() => handleUpgrade('yearly')} class="partyUpgrade__popBtn">
            <span>Yearly</span>
            <span class="partyUpgrade__price">$50</span>
          </button>
          <button onclick={() => handleUpgrade('lifetime')} class="partyUpgrade__popBtn">
            <span>Lifetime</span>
            <span class="partyUpgrade__price">$85</span>
          </button>
        </div>
      {/snippet}
    </Popover>
  {/if}
</Panel>

<style>
  :global {
    .panel.partyUpgrade {
      padding: 1rem;
      gap: 0.5rem;
    }
    .partyUpgrade__popContent {
      width: 260px;
    }
    .btn.partyUpgrade__btn {
      width: 100%;
      justify-content: space-between;
    }
    .btn.partyUpgrade__manage {
      width: 100%;
    }
    .partyUpgrade__popBtn {
      padding: 0.25rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4rem;
      border: solid 2px transparent;
      width: 100%;
      &:hover,
      &:focus-visible {
        background-color: var(--menuItemHover);
        border: var(--menuItemBorderHover);
        outline: none;
      }
    }
  }
  :global(.partyUpgrade .popTrigger) {
    width: 100%;
    justify-content: space-between;
  }
  .partyUpgrade__price {
    font-family: var(--font-mono);
  }
  .partyUpgrade__highlight {
    font-weight: 800;
    color: var(--fg);
    text-decoration: underline;
    text-decoration-style: dashed;
  }
</style>
