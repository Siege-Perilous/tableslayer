import { deletePartySchema, renamePartySchema } from '$lib/schemas';
import {
  getPartyFromSlug,
  getPartyGameSessions,
  getPartyMembers,
  isUserAdminInParty,
  isUserInParty
} from '$lib/server';
import { error, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const party = await getPartyFromSlug(params.party);
  const { user } = await parent();
  if (!party || !user) {
    return redirect(302, '/login');
  }

  const isUserInPartyResult = await isUserInParty(user.id, party.id);
  if (!isUserInPartyResult) {
    throw error(404, 'Not found');
  }

  const gameSessions = (await getPartyGameSessions(party.id)) || [];
  const isPartyAdmin = await isUserAdminInParty(user.id, party.id);
  const members = (await getPartyMembers(party.id)) || [];

  const deletePartyForm = await superValidate(zod(deletePartySchema));
  const renamePartyForm = await superValidate(zod(renamePartySchema));

  return {
    members,
    gameSessions,
    party,
    isPartyAdmin,
    deletePartyForm,
    renamePartyForm
  };
}) satisfies LayoutServerLoad;
