import { mutationFactory } from '$lib/factories';

export const useCreatePromoMutation = () =>
  mutationFactory({
    mutationKey: ['admin', 'promo', 'create'],
    endpoint: '/api/admin/promos/create',
    method: 'POST'
  });

export const useDeletePromoMutation = () =>
  mutationFactory({
    mutationKey: ['admin', 'promo', 'delete'],
    endpoint: '/api/admin/promos',
    method: 'DELETE',
    mutationFn: async (variables: { id: string }) => {
      const response = await fetch(`/api/admin/promos/${variables.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables)
      });

      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      return data;
    }
  });

export const useRedeemPromoMutation = () =>
  mutationFactory({
    mutationKey: ['promo', 'redeem'],
    endpoint: '/api/promos/redeem',
    method: 'POST'
  });
