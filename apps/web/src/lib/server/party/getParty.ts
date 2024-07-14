import { db } from '$lib/db';
import { partyMemberTable, partyTable, usersTable } from '$lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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
