import { db } from '$lib/db/app';
import {
  partyTable,
  promoRedemptionsTable,
  promosTable,
  usersTable,
  type SelectParty,
  type SelectPromo,
  type SelectPromoRedemption,
  type SelectUser
} from '$lib/db/app/schema';
import { and, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const PROMO_EXPIRY_DAYS = 30;

export interface PromoWithRedemption extends SelectPromo {
  redemptions: Array<{
    redemption: SelectPromoRedemption;
    user: Pick<SelectUser, 'id' | 'email' | 'name'> | null;
    party: Pick<SelectParty, 'id' | 'name'> | null;
  }>;
  creator: Pick<SelectUser, 'id' | 'email' | 'name'>;
}

export const validatePromo = async (key: string): Promise<{ valid: boolean; promo?: SelectPromo; error?: string }> => {
  try {
    // Check if promo exists and is active
    const promo = await db.select().from(promosTable).where(eq(promosTable.key, key)).get();

    if (!promo) {
      return { valid: false, error: 'Promo code not found' };
    }

    if (!promo.isActive) {
      return { valid: false, error: 'Promo code is no longer active' };
    }

    // Check if promo is expired (30 days from creation)
    const expiryDate = new Date(promo.createdAt);
    expiryDate.setDate(expiryDate.getDate() + PROMO_EXPIRY_DAYS);

    if (new Date() > expiryDate) {
      return { valid: false, error: 'Promo code has expired' };
    }

    return { valid: true, promo };
  } catch (error) {
    console.error('Error validating promo:', error);
    return { valid: false, error: 'Failed to validate promo code' };
  }
};

export const hasUserRedeemedPromo = async (promoId: string, userId: string): Promise<boolean> => {
  try {
    const redemption = await db
      .select()
      .from(promoRedemptionsTable)
      .where(and(eq(promoRedemptionsTable.promoId, promoId), eq(promoRedemptionsTable.userId, userId)))
      .get();

    return !!redemption;
  } catch (error) {
    console.error('Error checking promo redemption:', error);
    return true; // Fail safe - treat as already redeemed
  }
};

export const getPromoUsageCount = async (promoId: string): Promise<number> => {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(promoRedemptionsTable)
      .where(eq(promoRedemptionsTable.promoId, promoId))
      .get();

    return result?.count ?? 0;
  } catch (error) {
    console.error('Error getting promo usage count:', error);
    return 0;
  }
};

export const isPromoFullyRedeemed = async (promoId: string, maxUses: number): Promise<boolean> => {
  const usageCount = await getPromoUsageCount(promoId);
  return usageCount >= maxUses;
};

export const redeemPromo = async (promoId: string, userId: string, partyId: string): Promise<boolean> => {
  try {
    // Get promo details first to check maxUses
    const promo = await db.select().from(promosTable).where(eq(promosTable.id, promoId)).get();
    if (!promo) {
      throw new Error('Promo not found');
    }

    // Get party details to check for Stripe subscription
    const party = await db.select().from(partyTable).where(eq(partyTable.id, partyId)).get();
    if (!party) {
      throw new Error('Party not found');
    }

    // Start a transaction to atomically validate and update
    await db.transaction(async (tx) => {
      // Check if user already redeemed this promo (within transaction)
      const userRedemption = await tx
        .select()
        .from(promoRedemptionsTable)
        .where(and(eq(promoRedemptionsTable.promoId, promoId), eq(promoRedemptionsTable.userId, userId)))
        .get();

      if (userRedemption) {
        throw new Error('You have already redeemed this promo code');
      }

      // Count current redemptions (within transaction)
      const result = await tx
        .select({ count: sql<number>`count(*)` })
        .from(promoRedemptionsTable)
        .where(eq(promoRedemptionsTable.promoId, promoId))
        .get();

      const currentUsageCount = result?.count ?? 0;

      // Check against maxUses (within transaction)
      if (currentUsageCount >= promo.maxUses) {
        throw new Error('This promo code has reached its maximum uses');
      }

      // Update party to lifetime plan
      await tx.update(partyTable).set({ plan: 'lifetime' }).where(eq(partyTable.id, partyId)).execute();

      // Record redemption
      await tx
        .insert(promoRedemptionsTable)
        .values({
          id: uuidv4(),
          promoId,
          userId,
          partyId
        })
        .execute();
    });

    // Cancel Stripe subscription if it exists (do this after the transaction succeeds)
    if (party.stripeCustomerId && (party.plan === 'monthly' || party.plan === 'yearly')) {
      try {
        const Stripe = await import('stripe');
        const stripe = new Stripe.default(process.env.STRIPE_API_KEY!);

        // List all active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: party.stripeCustomerId,
          status: 'active'
        });

        // Cancel each active subscription immediately
        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id, {
            prorate: true // Give credit for unused time
          });
          console.log(`Cancelled Stripe subscription ${subscription.id} for party ${partyId} due to promo upgrade`);
        }
      } catch (stripeError) {
        // Log the error but don't fail the promo redemption
        console.error('Error cancelling Stripe subscription during promo redemption:', stripeError);
        // You might want to notify admins about this issue
      }
    }

    return true;
  } catch (error) {
    console.error('Error redeeming promo:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to redeem promo code');
  }
};

export const getPromoByKey = async (key: string): Promise<SelectPromo | undefined> => {
  try {
    return await db.select().from(promosTable).where(eq(promosTable.key, key)).get();
  } catch (error) {
    console.error('Error getting promo by key:', error);
    return undefined;
  }
};

export const createPromo = async (key: string, createdBy: string, maxUses: number = 1): Promise<SelectPromo> => {
  try {
    // Validate maxUses
    if (maxUses < 1) {
      throw new Error('Maximum uses must be at least 1');
    }

    const promo = await db
      .insert(promosTable)
      .values({
        id: uuidv4(),
        key,
        createdBy,
        maxUses
      })
      .returning()
      .get();

    return promo;
  } catch (error) {
    console.error('Error creating promo:', error);
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      throw new Error('A promo with this key already exists');
    }
    throw new Error('Failed to create promo');
  }
};

export const deletePromo = async (promoId: string): Promise<boolean> => {
  try {
    // Soft delete - set isActive to false
    await db.update(promosTable).set({ isActive: false }).where(eq(promosTable.id, promoId)).execute();
    return true;
  } catch (error) {
    console.error('Error deleting promo:', error);
    return false;
  }
};

export const getAllPromosWithRedemptions = async (): Promise<PromoWithRedemption[]> => {
  try {
    // Get all promos with creator info
    const promos = await db
      .select({
        promo: promosTable,
        creator: {
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name
        }
      })
      .from(promosTable)
      .leftJoin(usersTable, eq(promosTable.createdBy, usersTable.id))
      .orderBy(sql`${promosTable.createdAt} DESC`);

    // Get redemptions for each promo
    const promosWithRedemptions: PromoWithRedemption[] = await Promise.all(
      promos.map(async ({ promo, creator }) => {
        const redemptions = await db
          .select({
            redemption: promoRedemptionsTable,
            user: {
              id: usersTable.id,
              email: usersTable.email,
              name: usersTable.name
            },
            party: {
              id: partyTable.id,
              name: partyTable.name
            }
          })
          .from(promoRedemptionsTable)
          .leftJoin(usersTable, eq(promoRedemptionsTable.userId, usersTable.id))
          .leftJoin(partyTable, eq(promoRedemptionsTable.partyId, partyTable.id))
          .where(eq(promoRedemptionsTable.promoId, promo.id));

        return {
          ...promo,
          creator: creator || { id: '', email: 'Unknown', name: 'Unknown' },
          redemptions
        };
      })
    );

    return promosWithRedemptions;
  } catch (error) {
    console.error('Error getting promos with redemptions:', error);
    return [];
  }
};
