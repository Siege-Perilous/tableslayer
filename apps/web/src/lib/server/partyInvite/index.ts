import { db } from '$lib/db/app';
import {
  filesTable,
  partyInviteTable,
  partyMemberTable,
  partyTable,
  VALID_PARTY_ROLES,
  type PartyRole,
  type SelectPartyInvite,
  type SelectUser
} from '$lib/db/app/schema';
import { getUser, getUserByEmail, isEmailInUserTable, transformImage, type Thumb } from '$lib/server';
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

export type PartyInviteWithDetails = {
  invite: SelectPartyInvite;
  party: {
    id: string;
    name: string;
    slug: string;
  } & (Thumb | { thumb: null });
  invitedByUser: SelectUser & Thumb;
};

export const getPartyInvitesForEmail = async (email: string): Promise<PartyInviteWithDetails[]> => {
  try {
    const invitesWithPartyInfo = await db
      .select({
        invite: partyInviteTable,
        party: partyTable,
        avatarLocation: filesTable.location
      })
      .from(partyInviteTable)
      .innerJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id)) // Ensures party is always present
      .leftJoin(filesTable, eq(partyTable.avatarFileId, filesTable.id))
      .where(eq(partyInviteTable.email, email))
      .all();

    if (!invitesWithPartyInfo.length) {
      return [];
    }

    return await Promise.all(
      invitesWithPartyInfo.map(async (inviteWithParty) => {
        const invitedByUser = await getUser(inviteWithParty.invite.invitedBy);

        if (!inviteWithParty.avatarLocation) {
          return {
            ...inviteWithParty,
            party: {
              ...inviteWithParty.party,
              thumb: null
            },
            invitedByUser
          };
        }
        const thumb = await transformImage(inviteWithParty.avatarLocation, 'w=80,h=80,fit=cover,gravity=center');

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
  } catch (error) {
    console.error('Error fetching party invites for email', error);
    throw error;
  }
};

export const getPartyInvitesForCode = async (code: string): Promise<PartyInviteWithDetails> => {
  try {
    const inviteWithParty = await db
      .select({
        invite: partyInviteTable,
        party: {
          id: partyTable.id,
          name: partyTable.name,
          slug: partyTable.slug,
          avatarLocation: filesTable.location
        }
      })
      .from(partyInviteTable)
      .innerJoin(partyTable, eq(partyInviteTable.partyId, partyTable.id)) // Ensures party is always present
      .leftJoin(filesTable, eq(partyTable.avatarFileId, filesTable.id))
      .where(eq(partyInviteTable.code, code))
      .get();

    if (!inviteWithParty) {
      throw new Error('No party invite found for code');
    }

    const invitedByUser: SelectUser & Thumb = await getUser(inviteWithParty.invite.invitedBy);

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

export const refreshPartyInviteLink = async (partyId: string, email: string): Promise<{ inviteUrl: string }> => {
  try {
    const inviteCode = uuidv4();
    const hashedInviteCode = await createSha256Hash(inviteCode);

    const invite = await db
      .update(partyInviteTable)
      .set({ code: hashedInviteCode })
      .where(and(eq(partyInviteTable.email, email), eq(partyInviteTable.partyId, partyId)))
      .returning()
      .get();

    if (!invite) {
      throw new Error('No party invite found');
    }

    const baseURL = process.env.BASE_URL || 'http://localhost:5174';
    const inviteUrl = `${baseURL}/accept-invite/${inviteCode}`;

    return { inviteUrl };
  } catch (error) {
    console.error('Error refreshing party invite link', error);
    throw error;
  }
};
