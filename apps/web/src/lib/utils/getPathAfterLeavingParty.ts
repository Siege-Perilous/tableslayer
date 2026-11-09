import type { SelectParty } from '#lib/db/app/schema.js';

// A user with no parties left has nothing to pick from the header, so send them to create one
export const getPathAfterLeavingParty = (parties: Pick<SelectParty, 'id'>[] | undefined, leftPartyId: string) =>
  parties?.some((party) => party.id !== leftPartyId) ? '/profile' : '/create-party';
