<script lang="ts">
  import type { SelectParty } from '$lib/db/app/schema';
  import { useStripeCheckout } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { Button, Text } from '@tableslayer/ui';
  let { party }: { party: SelectParty } = $props();

  const stripeCheckout = useStripeCheckout();

  const handleUpgrade = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $stripeCheckout.mutateAsync({ partyId: party.id, plan: 'lifetime' }),
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

<Text>plan: {party.plan}</Text>
<Text>plan: {party.planNextBillingDate}</Text>
<Text>plan: {party.planExpirationDate}</Text>
<Button onclick={handleUpgrade}>Upgrade</Button>
