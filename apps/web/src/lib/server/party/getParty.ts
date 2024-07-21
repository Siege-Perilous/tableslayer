import { db } from '$lib/db';
import { partyInviteTable, partyMemberTable, partyTable, usersTable } from '$lib/db/schema';
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

export const getPartyMembers = async (partyId: string) => {
  const memberRelations = await db.select().from(partyMemberTable).where(eq(partyMemberTable.partyId, partyId));
  if (memberRelations === undefined || memberRelations.length === 0) {
    return [];
  } else {
    const userIds = memberRelations.map((relation) => relation.userId);
    const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds)).all();
    return users;
  }
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
