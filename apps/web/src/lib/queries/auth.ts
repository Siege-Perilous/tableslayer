import type { SelectUser } from '$lib/db/app/schema';
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

export const useAuthResetPasswordMutation = () => {
  return mutationFactory<{ email: string; password: string; confirmPassword: string; code: string }>({
    mutationKey: ['authResetPassword'],
    endpoint: '/api/auth/resetPassword',
    method: 'POST'
  });
};

export const useAuthVerifyEmailMutation = () => {
  return mutationFactory<{ code: string }>({
    mutationKey: ['authVerifyEmail'],
    endpoint: '/api/auth/verifyEmail',
    method: 'POST'
  });
};

export const useAuthResendVerificationEmailMutation = () => {
  return mutationFactory<{ userId: string }>({
    mutationKey: ['authResendVerificationEmail'],
    endpoint: '/api/auth/resendVerifyEmail',
    method: 'POST'
  });
};

export const useAuthChangeEmailMutation = () => {
  return mutationFactory<{ newEmail: string }>({
    mutationKey: ['authChangeEmail'],
    endpoint: '/api/auth/changeEmail',
    method: 'POST'
  });
};

export const useUpdateUserMutation = () => {
  return mutationFactory<
    { userData: Partial<SelectUser> },
    { success: boolean; user: SelectUser; emailWasChanged: boolean }
  >({
    mutationKey: ['updateUser'],
    endpoint: '/api/auth/updateUser',
    method: 'POST'
  });
};
