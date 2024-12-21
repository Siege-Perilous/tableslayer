import { notifySchema } from '$lib/schemas';
import { addEmailtoAudience } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    return redirect(302, '/profile');
  }
  const notifyForm = await superValidate(zod(notifySchema));
  return { notifyForm };
};

export const actions: Actions = {
  notify: async (event) => {
    const notifyForm = await superValidate(event.request, zod(notifySchema));
    if (!notifyForm.valid) {
      return message(notifyForm, { type: 'error', text: 'Invalid email' }, { status: 400 });
    }
    const { email } = notifyForm.data;
    try {
      const audienceResponse = await addEmailtoAudience(email);
      console.log('Audience response:', audienceResponse);
      return message(notifyForm, { type: 'success', text: 'Email added to our update list' });
    } catch (error) {
      console.error(error);
      return message(notifyForm, { type: 'error', text: 'Error adding email' }, { status: 500 });
    }
  }
};
