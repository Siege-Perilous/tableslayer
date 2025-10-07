/**
 * Stripe configuration utilities
 * Determines if Stripe is enabled based on environment variables
 */

export const isStripeEnabled = (): boolean => {
  const stripeApiKey = process.env.STRIPE_API_KEY;
  const stripeWebhookKey = process.env.STRIPE_WEBHOOK_KEY;
  const stripePriceIdLifetime = process.env.STRIPE_PRICE_ID_LIFETIME;
  const stripePriceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const stripePriceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY;

  return !!(stripeApiKey && stripeWebhookKey && stripePriceIdLifetime && stripePriceIdMonthly && stripePriceIdYearly);
};

export const getDefaultPartyPlan = (): 'free' | 'lifetime' => {
  return isStripeEnabled() ? 'free' : 'lifetime';
};
