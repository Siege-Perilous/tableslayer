<script lang="ts">
  import { type PartyPlan } from '$lib/db/app/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import { IconSelector } from '@tabler/icons-svelte';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { useStripeCheckout } from '$lib/queries';
  import { Button, Text, Spacer, Popover, Hr, Icon, Loader } from '@tableslayer/ui';
  let formIsLoading = $state(false);
  let { party }: { party: SelectParty } = $props();

  const checkout = useStripeCheckout();
  const handleUpgrade = async (plan: PartyPlan) => {
    await handleMutation({
      mutation: () => $checkout.mutateAsync({ partyId: party.id, plan }),
      toastMessages: {
        error: { title: 'Error', body: (error: FormMutationError) => error.message }
      },
      formLoadingState: (loading: boolean) => {
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
</script>

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

<style>
  .partyUpgrade__price {
    font-family: var(--font-mono);
  }
  :global {
    .partyUpgrade__popContent {
      width: 260px;
    }
    .btn.partyUpgrade__btn {
      width: 100%;
      justify-content: space-between;
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
</style>
