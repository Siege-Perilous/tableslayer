import { db } from '$lib/db/app';
import { partyInviteTable, partyMemberTable, partyTable, VALID_PARTY_ROLES } from '$lib/db/app/schema';
import { and, eq } from 'drizzle-orm';
import { getUser } from '../user';

export const getPartyInvitesForEmail = async (email: string) => {
  try {
    const invitesWithPartyInfo = await db
      .select({
        invite: partyInviteTable,
        party: {
          id: partyTable.id,
          name: partyTable.name,
          slug: partyTable.slug,
          avatarFileId: partyTable.avatarFileId
        }
      })
      .from(partyInviteTable)
      .leftJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id))
      .where(eq(partyInviteTable.email, email))
      .all();

    if (!invitesWithPartyInfo) {
      throw new Error('No party invites found for email');
    }

    return invitesWithPartyInfo;
  } catch (error) {
    console.error('Error fetching party invites for email', error);
    throw error;
  }
};

export const getPartyInvitesForCode = async (code: string) => {
  try {
    const invitesWithPartyInfo = await db
      .select({
        invite: partyInviteTable,
        party: {
          id: partyTable.id,
          name: partyTable.name,
          slug: partyTable.slug,
          avatarFileId: partyTable.avatarFileId
        }
      })
      .from(partyInviteTable)
      .leftJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id))
      .where(eq(partyInviteTable.code, code))
      .get();

    if (!invitesWithPartyInfo) {
      throw new Error('No party invites found for code');
    }

    const invitedById = invitesWithPartyInfo.invite.invitedBy;

    const invitedByUser = await getUser(invitedById);

    const invitesWithPartyInfoAndInvitedBy = {
      ...invitesWithPartyInfo,
      invitedByUser
    };

    return invitesWithPartyInfoAndInvitedBy;
  } catch (error) {
    console.error('Error fetching party invites for code', error);
    throw error;
  }
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

export const getPartyInvite = async (partyId: string, email: string) => {
  try {
    const invite = await db
      .select()
      .from(partyInviteTable)
      .where(and(eq(partyInviteTable.email, email), eq(partyInviteTable.partyId, partyId)))
      .get();
    if (!invite) {
      throw new Error('No party invite found');
    }
    return invite;
  } catch (error) {
    console.error('Error fetching party invite', error);
    throw error;
  }
};
