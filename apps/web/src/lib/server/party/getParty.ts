import { db } from '$lib/db';
import { partyTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

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
