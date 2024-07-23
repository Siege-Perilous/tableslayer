import { appDb, partyMemberTable } from '$lib/db';
import { and, eq } from 'drizzle-orm';

export const isUserAdminInParty = async (userId: string, partyId: string): Promise<boolean> => {
  const result = await appDb
    .select({ role: partyMemberTable.role })
    .from(partyMemberTable)
    .where(and(eq(partyMemberTable.userId, userId), eq(partyMemberTable.partyId, partyId)))
    .get();

  return (result && result.role === 'admin') || false;
};
