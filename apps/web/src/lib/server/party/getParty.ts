import { db } from '$lib/db';
import {
  partyInviteTable,
  partyMemberTable,
  partyTable,
  usersTable,
  type PartyRole,
  type SelectUser
} from '$lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const getParty = async (partyId: string) => {
  const party = await db.select().from(partyTable).where(eq(partyTable.id, partyId)).get();
  return party;
};

export const getPartyFromName = async (partyName: string) => {
  const party = await db.select().from(partyTable).where(eq(partyTable.name, partyName)).get();
  return party;
};

export const getPartyFromSlug = async (partySlug: string) => {
  const party = await db.select().from(partyTable).where(eq(partyTable.slug, partySlug)).get();
  return party;
};

export const getPartyMembers = async (
  partyId: string
): Promise<Array<SelectUser & { role: PartyRole; partyId: string }>> => {
  const memberRelations = await db
    .select({
      id: partyMemberTable.userId,
      role: partyMemberTable.role,
      partyId: partyMemberTable.partyId,
      name: usersTable.name,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      avatar: usersTable.avatar,
      passwordHash: usersTable.passwordHash
    })
    .from(partyMemberTable)
    .innerJoin(usersTable, eq(partyMemberTable.userId, usersTable.id))
    .where(eq(partyMemberTable.partyId, partyId))
    .orderBy(partyMemberTable.role) // Works only because the roles naturally are alpha
    .all();

  return memberRelations;
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

export const getPartiesForUser = async (userId: string) => {
  const partyMembers = await db.select().from(partyMemberTable).where(eq(partyMemberTable.userId, userId)).all();
  if (partyMembers === undefined || partyMembers.length === 0) {
    return [];
  } else {
    const partyIds = partyMembers.map((member) => member.partyId);
    const parties = await db.select().from(partyTable).where(inArray(partyTable.id, partyIds)).all();
    return parties;
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
