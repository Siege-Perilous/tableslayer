<script lang="ts">
  import type { SelectParty } from '$lib/db/app/schema';
  import { useLemonSqueezyCheckout } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { type PartyPlan } from '$lib/db/app/schema';
  import { Button, Text, Title, Spacer, Panel, Link } from '@tableslayer/ui';
  let { party }: { party: SelectParty } = $props();

  const checkout = useLemonSqueezyCheckout();

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
</script>

<Title as="h2" size="sm">Patronage</Title>
<Spacer />
<Panel class="partyUpgrade">
  {#if party.plan !== 'free'}
    <Text weight={800}>This party is on the {party.plan} plan.</Text>
    <Spacer size={2} />
    <Text color="var(--fgMuted)" size={'0.875rem'}>
      Unlock <span class="partyUpgrade__hightlight">ulimited sessions and scenes</span> with an upgraded account. Table
      Slayer is open source and <Link href="https://github.com/siege-perlious/tableslayer"
        >free to host on your own</Link
      >.
    </Text>

    <Spacer size={2} />
    <Spacer />
    <div class="partyUpgrade__buttons">
      <Button onclick={() => handleUpgrade('monthly')} variant="special">$5 - monthly</Button>
      <Button onclick={() => handleUpgrade('annual')} variant="special">$40 - yearly</Button>
      <Button onclick={() => handleUpgrade('lifetime')} variant="special">$85 - lifetime</Button>
    </div>
    <Text>plan: {party.plan}</Text>
    <Text>plan: {party.planNextBillingDate}</Text>
    <Text>plan: {party.planExpirationDate}</Text>
  {:else}
    <Text>plan: {party.plan}</Text>
    <Text>plan: {party.planNextBillingDate}</Text>
    <Text>plan: {party.planExpirationDate}</Text>
  {/if}
</Panel>

<style>
  :global(.panel.partyUpgrade) {
    padding: 1rem;
    gap: 0.5rem;
  }
  .partyUpgrade__buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    text-transform: capitalize;
  }
  .partyUpgrade__hightlight {
    font-weight: 800;
    color: var(--fg);
    text-decoration: underline;
    text-decoration-style: dashed;
  }
</style>
