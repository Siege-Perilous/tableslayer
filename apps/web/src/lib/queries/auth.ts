import { mutationFactory } from '$lib/factories';

export const useAuthLogin = () => {
  return mutationFactory<{ email: string; password: string }>({
    mutationKey: ['authLogin'],
    endpoint: '/api/auth/login',
    method: 'POST'
  });
};

export const useAuthSignup = () => {
  return mutationFactory<{ email: string; password: string; confirmPassword: string }>({
    mutationKey: ['authSignup'],
    endpoint: '/api/auth/signup',
    method: 'POST'
  });
};
