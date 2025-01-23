import { db } from '$lib/db/app';
import {
  gameSessionTable,
  partyInviteTable,
  partyMemberTable,
  partyTable,
  usersTable,
  type PartyRole,
  type SelectParty,
  type SelectUser
} from '$lib/db/app/schema';
import { getFile, transformImage, type Thumb } from '$lib/server';
import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';

export const getParty = async (partyId: string): Promise<SelectParty & Thumb> => {
  try {
    const party = await db.select().from(partyTable).where(eq(partyTable.id, partyId)).get();
    if (!party) {
      throw new Error('Party not found');
    }
    const file = await getFile(party.avatarFileId);
    const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    const partyWithThumb = { ...party, thumb: thumb };
    return partyWithThumb;
  } catch (error) {
    console.error('Error fetching party', error);
    throw error;
  }
};

export const getPartyFromName = async (partyName: string): Promise<SelectParty & Thumb> => {
  const party = await db.select().from(partyTable).where(eq(partyTable.name, partyName)).get();

  if (!party) {
    throw new Error('Party not found');
  }

  const file = await getFile(party.avatarFileId);
  const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
  const partyWithThumb = { ...party, thumb: thumb };
  return partyWithThumb;
};

export const getPartyFromSlug = async (partySlug: string): Promise<SelectParty & Thumb> => {
  //  console.time('getParty total time');
  const party = await db.select().from(partyTable).where(eq(partyTable.slug, partySlug)).get();

  if (!party) {
    error(404, 'Party not found');
  }

  const file = await getFile(party.avatarFileId);
  const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
  const partyWithThumb = { ...party, thumb: thumb };
  //  console.timeEnd('getParty total time');
  return partyWithThumb;
};

export const getPartyMembers = async (
  partyId: string
): Promise<Array<SelectUser & { role: PartyRole; partyId: string } & Thumb>> => {
  const memberRelations = await db
    .select({
      id: partyMemberTable.userId,
      role: partyMemberTable.role,
      partyId: partyMemberTable.partyId,
      name: usersTable.name,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      avatarFileId: usersTable.avatarFileId,
      passwordHash: usersTable.passwordHash
    })
    .from(partyMemberTable)
    .innerJoin(usersTable, eq(partyMemberTable.userId, usersTable.id))
    .where(eq(partyMemberTable.partyId, partyId))
    .orderBy(partyMemberTable.role) // Works only because the roles naturally are alpha
    .all();

  const memberWithThumbs = [];
  for (const member of memberRelations) {
    const file = await getFile(member.avatarFileId);
    const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    const memberWithThumb = { ...member, thumb: thumb };
    memberWithThumbs.push(memberWithThumb);
  }

  return memberWithThumbs;
};

export const isUserByEmailInPartyAlready = async (email: string, partyId: string) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();
  if (user === undefined) {
    return false;
  }
  const partyMember = await db
    .select()
    .from(partyMemberTable)
    .where(and(eq(partyMemberTable.userId, user.id), eq(partyMemberTable.partyId, partyId)))
    .get();

  return !!partyMember;
};

export const isEmailAlreadyInvitedToParty = async (email: string, partyId: string) => {
  const inviteRelation = await db
    .select()
    .from(partyInviteTable)
    .where(and(eq(partyInviteTable.email, email), eq(partyInviteTable.partyId, partyId)))
    .get();

  return !!inviteRelation;
};

export const getEmailsInvitedToParty = async (partyId: string) => {
  const inviteRelations = await db.select().from(partyInviteTable).where(eq(partyInviteTable.partyId, partyId)).all();
  const emails = inviteRelations.map((invite) => invite.email);
  return emails;
};

export const getPartiesForUser = async (userId: string): Promise<Array<SelectParty & Thumb>> => {
  const partyMembers = await db.select().from(partyMemberTable).where(eq(partyMemberTable.userId, userId)).all();
  if (partyMembers === undefined || partyMembers.length === 0) {
    return [];
  } else {
    const partyIds = partyMembers.map((member) => member.partyId);
    const parties = await db.select().from(partyTable).where(inArray(partyTable.id, partyIds)).all();
    const partiesWithThumb = [];
    for (const party of parties) {
      const file = await getFile(party.avatarFileId);
      const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
      const partyWithThumb = { ...party, thumb: thumb };
      partiesWithThumb.push(partyWithThumb);
    }
    return partiesWithThumb;
  }
};

export const changePartyRole = async (userId: string, partyId: string, role: PartyRole) => {
  const existingMember = await db
    .select()
    .from(partyMemberTable)
    .where(and(eq(partyMemberTable.userId, userId), eq(partyMemberTable.partyId, partyId)))
    .get();

  if (!existingMember) {
    throw new Error('User is not a member of the party.');
  }

  // Update the user's role in the party
  await db
    .update(partyMemberTable)
    .set({ role: role })
    .where(and(eq(partyMemberTable.userId, userId), eq(partyMemberTable.partyId, partyId)))
    .run();
};

export const isUserInParty = async (userId: string, partyId: string) => {
  try {
    const partyMember = await db
      .select()
      .from(partyMemberTable)
      .where(and(eq(partyMemberTable.userId, userId), eq(partyMemberTable.partyId, partyId)))
      .get();
    return !!partyMember;
  } catch (error) {
    console.error('Error checking if user is in party', error);
    return false;
  }
};

export const getPartyFromGameSessionDbName = async (dbName: string) => {
  const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.dbName, dbName)).get();

  if (!gameSession) {
    throw new Error('Game session not found');
  }

  const party = await db.select().from(partyTable).where(eq(partyTable.id, gameSession.partyId)).get();

  if (!party) {
    throw new Error('Party not found');
  }

  return party;
};
