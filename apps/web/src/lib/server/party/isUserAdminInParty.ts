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

export const isUserOnlyAdminInParty = async (userId: string, partyId: string): Promise<boolean> => {
  const isAdmin = await isUserAdminInParty(userId, partyId);
  const adminsCount = await db.$count(
    partyMemberTable,
    and(eq(partyMemberTable.role, 'admin'), eq(partyMemberTable.partyId, partyId))
  );

  console.log('isAdmin', isAdmin);
  console.log('adminsCount', adminsCount);

  return isAdmin && adminsCount === 1;
};
