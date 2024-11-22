import { VALID_PARTY_ROLES } from '$lib/db/app/schema';
import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

// Vefify email
export const changeUserEmailSchema = z.object({
  email: z.string().email()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z
  .object({
    userId: z.string(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const resendVerificationCodeSchema = z.object({});

export const verificationCodeSchema = z.object({
  code: z.string()
});

// Member invitations
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  partyId: z.string()
});

export const resendInviteSchema = z.object({
  email: z.string().email(),
  partyId: z.string()
});

export type ResendInviteSchema = typeof resendInviteSchema;
export type ResendInviteFormType = z.infer<typeof resendInviteSchema>;

export const inviteResponseSchema = z.object({
  code: z.string()
});

const roleSchema = z.enum(VALID_PARTY_ROLES);
export const changeRoleSchema = z.object({
  userId: z.string(),
  role: roleSchema,
  partyId: z.string()
});
export type ChangeRoleSchema = typeof changeRoleSchema;
export type ChangeRoleFormType = z.infer<typeof changeRoleSchema>;
