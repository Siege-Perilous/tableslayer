import { db } from '$lib/db/app';
import {
  filesTable,
  partyInviteTable,
  partyMemberTable,
  partyTable,
  VALID_PARTY_ROLES,
  type PartyRole,
  type SelectPartyInvite
} from '$lib/db/app/schema';
import { getUser, getUserByEmail, isEmailInUserTable, transformImage } from '$lib/server';
import { createSha256Hash } from '$lib/utils/hash';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { sendPartyInviteEmail } from '../email';
import { UserAlreadyInPartyError, UserAlreadyInvitedError } from '../errors';
import { isUserInParty } from '../party/getParty';

export const createPartyInvite = async (email: string, partyId: string, invitedBy: string, role: PartyRole) => {
  try {
    // Check if an invite already exists for the email and party
    const existingInvite = await db
      .select()
      .from(partyInviteTable)
      .where(and(eq(partyInviteTable.email, email), eq(partyInviteTable.partyId, partyId)))
      .get();

    if (existingInvite) {
      throw new UserAlreadyInvitedError('User already invited');
    }

    const isExistingUser = await isEmailInUserTable(email);

    if (isExistingUser) {
      const invitedUser = await getUserByEmail(email);
      if (!invitedUser) {
        throw new Error('Unexpected: User exists in table but could not be fetched');
      }

      const isInvitedUserInParty = await isUserInParty(invitedUser.id, partyId);
      if (isInvitedUserInParty) {
        throw new UserAlreadyInPartyError('User already in party');
      }
    }
    const inviteCode = uuidv4();
    const hashedInviteCode = await createSha256Hash(inviteCode);

    // Generate the invite code and create the invite
    const newInvite = await db
      .insert(partyInviteTable)
      .values({
        partyId,
        invitedBy,
        code: hashedInviteCode,
        email,
        role
      })
      .returning()
      .get();

    await sendPartyInviteEmail(partyId, email, inviteCode);

    return newInvite;
  } catch (error) {
    console.error('Error creating party invite:', error);
    throw error;
  }
};

export const getPartyInvitesForEmail = async (email: string) => {
  try {
    const invitesWithPartyInfo = await db
      .select({
        invite: partyInviteTable,
        party: {
          id: partyTable.id,
          name: partyTable.name,
          slug: partyTable.slug,
          avatarLocation: filesTable.location // Fetch file location for the avatar
        }
      })
      .from(partyInviteTable)
      .leftJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id))
      .leftJoin(filesTable, eq(partyTable.avatarFileId, filesTable.id)) // Join for the avatar
      .where(eq(partyInviteTable.email, email))
      .all();

    if (!invitesWithPartyInfo || invitesWithPartyInfo.length === 0) {
      return [];
    }

    const invitesWithDetails = await Promise.all(
      invitesWithPartyInfo.map(async (inviteWithParty) => {
        const invitedById = inviteWithParty.invite.invitedBy;
        const invitedByUser = await getUser(invitedById);

        // Generate thumbnail if avatar exists
        const thumb = inviteWithParty.party.avatarLocation
          ? await transformImage(inviteWithParty.party.avatarLocation, 'w=80,h=80,fit=cover,gravity=center')
          : null;

        return {
          ...inviteWithParty,
          party: {
            ...inviteWithParty.party,
            thumb
          },
          invitedByUser
        };
      })
    );

    return invitesWithDetails;
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
        party: partyTable
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

export const deletePartyInvite = async (partyInviteId: string) => {
  try {
    await db.delete(partyInviteTable).where(eq(partyInviteTable.id, partyInviteId)).run();
  } catch (error) {
    console.error('Error deleting party invite', error);
    throw error;
  }
};

export const deletePartyInviteByEmail = async (partyId: string, email: string) => {
  try {
    await db
      .delete(partyInviteTable)
      .where(and(eq(partyInviteTable.email, email), eq(partyInviteTable.partyId, partyId)))
      .execute();
  } catch (error) {
    console.error('Error deleting party invite', error);
    throw error;
  }
};

export const resendPartyInvite = async (partyId: string, email: string): Promise<SelectPartyInvite> => {
  try {
    const inviteCode = uuidv4();
    const hashedInviteCode = await createSha256Hash(inviteCode);

    const invite = await db
      .update(partyInviteTable)
      .set({ code: hashedInviteCode })
      .where(eq(partyInviteTable.email, email))
      .returning()
      .get();

    if (!invite) {
      throw new Error('No party invite found');
    }

    await sendPartyInviteEmail(partyId, email, inviteCode);

    return invite;
  } catch (error) {
    console.error('Error resending party invite', error);
    throw error;
  }
};
