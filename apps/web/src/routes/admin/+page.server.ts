import { getAllPromosWithRedemptions } from '$lib/server/promo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const promos = await getAllPromosWithRedemptions();

  // Calculate expiry status for each promo
  const promosWithStatus = promos.map((promo) => {
    const createdDate = new Date(promo.createdAt);
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    const isExpired = new Date() > expiryDate;

    return {
      ...promo,
      expiryDate,
      isExpired,
      isUsed: promo.redemptions.length > 0
    };
  });

  return {
    promos: promosWithStatus
  };
};
