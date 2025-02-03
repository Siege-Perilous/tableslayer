import { apiFactory } from '$lib/factories';
import { generatePresignedWriteUrl } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name cannot be empty')
    .regex(/^[a-zA-Z0-9-_/.]+$/, 'Invalid file name format')
    .refine((name) => !name.includes('//') && !name.endsWith('/'), {
      message: 'Invalid file name structure'
    }),
  contentType: z
    .string()
    .min(1, 'Content type cannot be empty')
    .regex(/^[-\w]+\/[-\w]+$/, 'Invalid content type format')
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }
    const { fileName, contentType } = body;

    // Generate presigned URL
    const signedUrl = await generatePresignedWriteUrl(fileName, contentType);
    return { signedUrl };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create presigned URLs',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the presigned URL.'
  }
);
