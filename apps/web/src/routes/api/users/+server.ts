import { appDb, selectUserSchema, usersTable } from '$lib/db';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const users = await appDb.select().from(usersTable);

  // Validate users using generated Zod schema
  const parsedUsers = selectUserSchema.array().safeParse(users);
  if (!parsedUsers.success) {
    return json({ error: 'Invalid user data' }, { status: 500 });
  }

  return json(parsedUsers.data);
};
