import { mutationFactory } from '$lib/factories';

export const useUpdateChecklistProgressMutation = () => {
  return mutationFactory<
    { completedItems: string[]; dismissed?: boolean },
    { success: boolean; completedItems: string[] }
  >({
    mutationKey: ['updateChecklistProgress'],
    endpoint: '/api/checklist/update',
    method: 'POST',
    onSuccess: async () => {
      // Don't invalidate queries - checklist state is managed locally
      return;
    }
  });
};
