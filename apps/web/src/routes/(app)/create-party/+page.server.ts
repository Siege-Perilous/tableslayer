import { createPartySchema } from '$lib/schemas';
import { uploadFileFromInput } from '$lib/server';
import { createNamedPartyForUser, updatePartyAvatar } from '$lib/server/party/createParty';
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
      const party = await createNamedPartyForUser(userId, name);
      console.log('Created party', party);
      const uploadedFile = await uploadFileFromInput(file, userId, 'partyavatars');
      console.log('Uploaded file', uploadedFile);
      const partyWithAvatar = await updatePartyAvatar(party.id, uploadedFile.fileId);
      console.log('Updated party with avatar', partyWithAvatar);
      message(createPartyForm, { type: 'success', text: 'Party created' });
      return redirect(302, `/${partyWithAvatar.slug}`);
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      } else {
        console.error('Error creating party', error);

        let errorMessage = 'An unknown error occurred';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        if (errorMessage.includes('UNIQUE')) {
          return message(createPartyForm, { type: 'error', text: 'Party name is already taken' }, { status: 400 });
        } else {
          return message(
            createPartyForm,
            { type: 'error', text: `Error creating party: ${errorMessage}` },
            { status: 500 }
          );
        }
      }
    }
  }
};
