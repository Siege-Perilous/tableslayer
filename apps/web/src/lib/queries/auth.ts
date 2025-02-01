import { mutationFactory } from '$lib/factories';

export const useAuthLogin = () => {
  return mutationFactory<{ email: string; password: string }>({
    mutationKey: ['authLogin'],
    endpoint: '/api/auth/login',
    method: 'POST'
  });
};
