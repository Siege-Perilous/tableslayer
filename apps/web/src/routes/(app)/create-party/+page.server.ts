import { createPartySchema } from '$lib/schemas';
import { uploadFileFromInput } from '$lib/server';
import { createNamedPartyForUser } from '$lib/server/party/createParty';
import { isRedirect, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const createPartyForm = await superValidate(zod(createPartySchema));
  return { createPartyForm };
};

export const actions: Actions = {
  createParty: async (event) => {
    const userId = event.locals.user.id;
    const createPartyForm = await superValidate(event.request, zod(createPartySchema));
    console.log('Creating party', createPartyForm, 'event.reuest', event.request);

    try {
      if (!createPartyForm.valid) {
        return message(createPartyForm, { type: 'error', text: 'Invalid party data' }, { status: 400 });
      }
      const { name, file } = createPartyForm.data;
      console.log('Creating party', name, file);
      const uploadedFile = await uploadFileFromInput(file, userId, 'partyavatars');
      console.log('Uploaded file', uploadedFile);
      const party = await createNamedPartyForUser(userId, name, uploadedFile.fileId);
      console.log('Created party', party);
      message(createPartyForm, { type: 'success', text: 'Party created' });
      return redirect(302, `/party/${party.slug}`);
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      } else {
        console.error('Error creating party', error);
        message(createPartyForm, { type: 'error', text: 'Error creating party' }, { status: 500 });
      }
    }
  }
};
