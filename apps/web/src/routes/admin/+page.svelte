<script lang="ts">
  import { Button, Title, Spacer, Input, FormControl, Table, Th, Td, Text, Link } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { useCreatePromoMutation, useDeletePromoMutation } from '$lib/queries/admin';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  let newPromoKey = $state('');
  let formIsLoading = $state(false);
  let createError = $state<FormMutationError | undefined>(undefined);

  const createPromo = useCreatePromoMutation();
  const deletePromo = useDeletePromoMutation();

  const handleCreatePromo = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $createPromo.mutateAsync({ key: newPromoKey }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        createError = error;
      },
      onSuccess: async () => {
        newPromoKey = '';
        createError = undefined;
        await invalidateAll();
      },
      toastMessages: {
        success: { title: 'Promo created successfully' },
        error: { title: 'Failed to create promo', body: (error) => error.message }
      }
    });
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm('Are you sure you want to delete this promo?')) return;

    await handleMutation({
      mutation: () => $deletePromo.mutateAsync({ id: promoId }),
      formLoadingState: () => {},
      onSuccess: async () => {
        await invalidateAll();
      },
      toastMessages: {
        success: { title: 'Promo deleted successfully' },
        error: { title: 'Failed to delete promo' }
      }
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (promo: (typeof data.promos)[0]) => {
    if (!promo.isActive) return { text: 'Deleted', class: 'admin__status--deleted' };
    if (promo.isExpired) return { text: 'Expired', class: 'admin__status--expired' };
    if (promo.isUsed) return { text: 'Used', class: 'admin__status--used' };
    return { text: 'Active', class: 'admin__status--active' };
  };
</script>

<Head title="Admin - Promo Management" description="Manage promotional codes" />

<div class="admin">
  <div class="admin__section">
    <Title as="h2" size="md">Create New Promo</Title>
    <Spacer />
    <form onsubmit={handleCreatePromo} class="admin__form">
      <FormControl label="Promo Key" name="key" errors={createError?.errors}>
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="text"
            bind:value={newPromoKey}
            placeholder="summer2024"
            pattern="[a-zA-Z0-9-]+"
            disabled={formIsLoading}
          />
        {/snippet}
      </FormControl>
      <Button type="submit" isLoading={formIsLoading} disabled={formIsLoading || !newPromoKey}>Create Promo</Button>
    </form>
  </div>

  <Spacer size="3rem" />

  <div class="admin__section">
    <Title as="h2" size="sm">Existing Promos</Title>
    <Spacer />

    {#if data.promos.length === 0}
      <Text>No promos created yet.</Text>
    {:else}
      <div class="admin__table-wrapper">
        <Table>
          <thead>
            <tr>
              <Th>Key</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Expires</Th>
              <Th>Redeemed By</Th>
              <Th>Party</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {#each data.promos as promo}
              {@const status = getStatusBadge(promo)}
              <tr>
                <Td>
                  <Link href="/promo/{promo.key}" target="_blank" class="admin__link">
                    {promo.key}
                  </Link>
                </Td>
                <Td>
                  <span class="admin__status {status.class}">{status.text}</span>
                </Td>
                <Td>{formatDate(promo.createdAt)}</Td>
                <Td>{formatDate(promo.expiryDate)}</Td>
                <Td>
                  {#if promo.redemptions.length > 0}
                    {promo.redemptions[0].user?.email || 'Unknown'}
                  {/if}
                </Td>
                <Td>
                  {#if promo.redemptions.length > 0}
                    {promo.redemptions[0].party?.name || 'Unknown'}
                  {:else}
                    <span class="admin__text--muted">-</span>
                  {/if}
                </Td>
                <Td>
                  {#if promo.isActive && !promo.isUsed}
                    <Button size="sm" variant="danger" onclick={() => handleDeletePromo(promo.id)}>Delete</Button>
                  {/if}
                </Td>
              </tr>
            {/each}
          </tbody>
        </Table>
      </div>
    {/if}
  </div>
</div>

<style>
  .admin {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .admin__section {
    margin-bottom: 2rem;
  }

  .admin__form {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    max-width: 500px;
  }

  .admin__form :global(.form-control) {
    flex: 1;
  }

  .admin__table-wrapper {
    overflow-x: auto;
  }

  .admin__table-wrapper :global(table) {
    width: 100%;
    min-width: 800px;
  }

  .admin__status {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .admin__status--active {
    color: var(--fgSuccess);
  }

  .admin__status--used {
    color: var(--fgMuted);
  }

  .admin__status--expired {
    color: var(--fgDanger);
  }

  .admin__status--deleted {
    color: var(--fgDanger);
  }

  .admin__text--muted {
    color: var(--fgMuted);
  }

  .admin__link {
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .admin__form {
      flex-direction: column;
      align-items: stretch;
    }

    .admin {
      margin: 1rem auto;
    }
  }
</style>
