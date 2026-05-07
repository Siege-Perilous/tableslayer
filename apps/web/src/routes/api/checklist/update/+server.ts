import { apiFactory } from '$lib/factories';
import { updateUserChecklistProgress } from '$lib/server';
import { z } from 'zod';

const updateChecklistValidation = z.object({
  completedItems: z.array(z.string()),
  dismissed: z.boolean().optional()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    const { completedItems, dismissed } = body;
    const result = await updateUserChecklistProgress(locals.user.id, completedItems, dismissed);

    return { success: true, completedItems: result.completedItems };
  },
  {
    validationSchema: updateChecklistValidation,
    validationErrorMessage: 'Invalid checklist data',
    unauthorizedMessage: 'You must be logged in to update checklist progress.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating checklist progress.'
  }
);
