<script lang="ts">
  import type { SelectParty } from '$lib/db/app/schema';
  import { useLemonSqueezyCheckout, useLemonSqueezyCustomerPortal } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { type PartyPlan } from '$lib/db/app/schema';
  import { Button, Text, Title, Spacer, Panel, Link } from '@tableslayer/ui';
  let { party }: { party: SelectParty } = $props();

  const checkout = useLemonSqueezyCheckout();
  const portal = useLemonSqueezyCustomerPortal();

  const handleUpgrade = async (plan: PartyPlan) => {
    await handleMutation({
      mutation: () => $checkout.mutateAsync({ partyId: party.id, plan }),
      toastMessages: {
        error: { title: 'Error', body: (error) => error.message }
      },
      formLoadingState: () => {},
      onSuccess: (result) => {
        if (result.url) {
          console.log(result.url);
          window.location.href = result.url;
        }
      }
    });
  };

  const handleCustomerPortal = async () => {
    if (party.lemonSqueezyCustomerId === null) return;

    await handleMutation({
      mutation: () => $portal.mutateAsync({ customerId: party.lemonSqueezyCustomerId as number }),
      toastMessages: {
        error: { title: 'Error', body: (error) => error.message }
      },
      formLoadingState: () => {},
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

<Title as="h2" size="sm">Patronage</Title>
<Spacer />
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
      {#if party.planNextBillingDate}
        <Text size="0.875rem">Your plan renews on {formatDate(party.planNextBillingDate)}.</Text>
      {:else if party.planExpirationDate}
        <Text size="0.875rem">Your plan expires on {formatDate(party.planExpirationDate)}.</Text>
      {/if}
      <Spacer />
      <Button onclick={() => handleCustomerPortal()} class="partyUpgrade__btn">Manage subscription</Button>
    {/if}
  {:else}
    <Text weight={800}>Upgrade your party</Text>
    <Spacer size={2} />
    <Text color="var(--fgMuted)" size={'0.875rem'}>
      Unlock <span class="partyUpgrade__highlight">unlimited sessions and scenes</span> with an upgraded account. Table
      Slayer is open source and <Link href="https://github.com/siege-perlious/tableslayer"
        >free to host on your own</Link
      >.
    </Text>
    <Spacer />
    <Button onclick={() => handleUpgrade('monthly')} variant="special" class="partyUpgrade__btn"
      >Upgrade your party</Button
    >
  {/if}
</Panel>

<style>
  :global(.panel.partyUpgrade) {
    padding: 1rem;
    gap: 0.5rem;
  }
  :global(.partyUpgrade__btn) {
    width: 100%;
  }
  .partyUpgrade__highlight {
    font-weight: 800;
    color: var(--fg);
    text-decoration: underline;
    text-decoration-style: dashed;
  }
</style>
