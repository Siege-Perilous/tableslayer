import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

type HandlerFn<BodyType> = (event: Parameters<RequestHandler>[0] & { body: BodyType }) => Promise<unknown>;

export function apiFactory<BodyType>(
  handler: HandlerFn<BodyType>,
  {
    validationSchema,
    unauthorizedMessage = 'Unauthorized request.',
    validationErrorMessage = 'Validation errors occurred.',
    unexpectedErrorMessage = 'An unexpected error occurred.'
  }: {
    validationSchema: z.ZodType<BodyType>; // Zod schema is required to validate and type the body
    unauthorizedMessage?: string; // Custom unauthorized error message
    validationErrorMessage?: string; // Custom validation error message
    unexpectedErrorMessage?: string; // Custom unexpected error message
  }
): RequestHandler {
  return async (event) => {
    try {
      // Validate the body using the provided schema
      const body: BodyType = validationSchema.parse(await event.request.json());

      // Pass the validated body to the handler
      const result = await handler({ ...event, body });
      return json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        // Handle validation errors
        return json(
          {
            success: false,
            status: 400,
            message: validationErrorMessage,
            errors: err.errors
          },
          { status: 400 }
        );
      }

      if (err instanceof Response) {
        // Handle explicit `throw error(...)` responses
        return err;
      }

      if (err instanceof Error && err.message === 'Unauthorized') {
        // Handle unauthorized errors
        return json(
          {
            success: false,
            status: 401,
            message: unauthorizedMessage
          },
          { status: 401 }
        );
      }

      if (err instanceof Error) {
        return json(
          {
            success: false,
            status: 400,
            message: err.message
          },
          { status: 400 }
        );
      }

      // Handle unexpected errors
      return json(
        {
          success: false,
          status: 500,
          message: unexpectedErrorMessage
        },
        { status: 500 }
      );
    }
  };
}
