import { db } from '$lib/db';
import { partyInviteTable, partyMemberTable, partyTable, VALID_PARTY_ROLES } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const getPartyInvitesForEmail = async (email: string) => {
  const invitesWithPartyInfo = await db
    .select({
      invite: partyInviteTable,
      party: {
        id: partyTable.id,
        name: partyTable.name,
        slug: partyTable.slug,
        avatar: partyTable.avatar
      }
    })
    .from(partyInviteTable)
    .leftJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id))
    .where(eq(partyInviteTable.email, email))
    .all();

  return invitesWithPartyInfo;
};

export const getPartyInvitesForCode = async (code: string) => {
  const invitesWithPartyInfo = await db
    .select({
      invite: partyInviteTable,
      party: {
        id: partyTable.id,
        name: partyTable.name,
        slug: partyTable.slug,
        avatar: partyTable.avatar
      }
    })
    .from(partyInviteTable)
    .leftJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id))
    .where(eq(partyInviteTable.code, code))
    .get();
  return invitesWithPartyInfo;
};

export const acceptPartyInvite = async (code: string, userId: string) => {
  const invite = await db.select().from(partyInviteTable).where(eq(partyInviteTable.code, code)).get();

  if (!invite) {
    return false;
  }

  const role = invite.role;
  const isValidRole = VALID_PARTY_ROLES.includes(role);
  if (!isValidRole) {
    return false;
  }

  await db.delete(partyInviteTable).where(eq(partyInviteTable.code, code)).run();
  await db.insert(partyMemberTable).values({ partyId: invite.partyId, userId, role: invite.role }).run();

  return true;
};

export const declinePartyInvite = async (code: string) => {
  await db.delete(partyInviteTable).where(eq(partyInviteTable.code, code)).run();
};
