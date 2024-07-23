import { db } from '$lib/db/app';
import { partyMemberTable } from '$lib/db/app/schema';
import { and, eq } from 'drizzle-orm';

export const isUserAdminInParty = async (userId: string, partyId: string): Promise<boolean> => {
  const result = await db
    .select({ role: partyMemberTable.role })
    .from(partyMemberTable)
    .where(and(eq(partyMemberTable.userId, userId), eq(partyMemberTable.partyId, partyId)))
    .get();

  return (result && result.role === 'admin') || false;
};
