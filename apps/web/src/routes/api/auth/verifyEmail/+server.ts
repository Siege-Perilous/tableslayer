import { apiFactory } from '$lib/factories';
import { verifyEmail } from '$lib/server';
import { hasUserRedeemedPromo, redeemPromo, validatePromo } from '$lib/server/promo';
import { z } from 'zod';

const validationSchema = z.object({
  code: z.string()
});

export const POST = apiFactory(
  async ({ locals, body, cookies }) => {
    try {
      if (!locals.user) {
        throw new Error('Must be logged in to change email');
      }
      const userId = locals.user.id;
      const { code } = body;
      await verifyEmail(userId, code);

      let partySlug: string | undefined;

      // Check for promo cookie after successful verification
      const promoKey = cookies.get('promo');
      if (promoKey) {
        try {
          // Validate promo
          const validation = await validatePromo(promoKey);
          if (validation.valid && validation.promo) {
            // Check if not already redeemed
            const alreadyRedeemed = await hasUserRedeemedPromo(validation.promo.id, userId);
            if (!alreadyRedeemed) {
              // Get the user's first party (created during signup)
              const { getPartiesForUser } = await import('$lib/server');
              const parties = await getPartiesForUser(userId);

              if (parties && parties.length > 0) {
                const party = parties[0];

                // Upgrade the existing party to lifetime plan
                await redeemPromo(validation.promo.id, userId, party.id);

                // Clear promo cookie
                cookies.delete('promo', { path: '/' });

                // Store party slug to redirect to it
                partySlug = party.slug;
              }
            }
          }
        } catch (error) {
          console.error('Error applying promo during email verification:', error);
          // Don't fail verification if promo fails
        }
      }

      return { success: true, partySlug };
    } catch (error) {
      console.error('Resend verify email error', error);
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized',
    unexpectedErrorMessage: 'An unexpected error occurred'
  }
);
