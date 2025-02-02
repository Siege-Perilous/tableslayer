import { mutationFactory } from '$lib/factories';

export const useAuthLoginMutation = () => {
  return mutationFactory<{ email: string; password: string }>({
    mutationKey: ['authLogin'],
    endpoint: '/api/auth/login',
    method: 'POST'
  });
};

export const useAuthSignupMutation = () => {
  return mutationFactory<{ email: string; password: string; confirmPassword: string }>({
    mutationKey: ['authSignup'],
    endpoint: '/api/auth/signup',
    method: 'POST'
  });
};

export const useAuthForgotPasswordMutation = () => {
  return mutationFactory<{ email: string }>({
    mutationKey: ['authForgotPassword'],
    endpoint: '/api/auth/forgotPassword',
    method: 'POST'
  });
};
