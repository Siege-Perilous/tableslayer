import { mutationFactory } from '$lib/factories';

export const useAddEmailToAudienceMutation = () => {
  return mutationFactory<{ email: string }>({
    mutationKey: ['addEmailToAudience'],
    endpoint: '/api/email/addEmailToAudience',
    method: 'POST'
  });
};
