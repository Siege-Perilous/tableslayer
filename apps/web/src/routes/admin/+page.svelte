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
    if (!promo.isActive) return { text: 'Deleted', class: 'status--deleted' };
    if (promo.isExpired) return { text: 'Expired', class: 'status--expired' };
    if (promo.isUsed) return { text: 'Used', class: 'status--used' };
    return { text: 'Active', class: 'status--active' };
  };
</script>

<Head title="Admin - Promo Management" description="Manage promotional codes" />

<div class="admin-container">
  <div class="create-section">
    <Title as="h2" size="md">Create New Promo</Title>
    <Spacer />
    <form onsubmit={handleCreatePromo} class="create-form">
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

  <div class="promos-section">
    <Title as="h2" size="sm">Existing Promos</Title>
    <Spacer />

    {#if data.promos.length === 0}
      <Text>No promos created yet.</Text>
    {:else}
      <div class="table-wrapper">
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
                  <Link href="/promo/{promo.key}" target="_blank" class="promo-link">
                    {promo.key}
                  </Link>
                </Td>
                <Td>
                  <span class="status-badge {status.class}">{status.text}</span>
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
                    <span class="text-muted">-</span>
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
  .admin-container {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .create-form {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    max-width: 500px;
  }

  .create-form :global(.form-control) {
    flex: 1;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .table-wrapper :global(table) {
    width: 100%;
    min-width: 800px;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status--active {
    background-color: var(--color-success-bg);
    color: var(--color-success);
  }

  .status--used {
    background-color: var(--color-info-bg);
    color: var(--color-info);
  }

  .status--expired {
    background-color: var(--color-warning-bg);
    color: var(--color-warning);
  }

  .status--deleted {
    background-color: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .text-muted {
    color: var(--color-text-muted);
  }

  .promo-link {
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .create-form {
      flex-direction: column;
      align-items: stretch;
    }

    .admin-container {
      margin: 1rem auto;
    }
  }
</style>
