import { db } from '$lib/db';
import { selectUserSchema, usersTable } from '$lib/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const users = await db.select().from(usersTable);

  // Validate users using generated Zod schema
  const parsedUsers = selectUserSchema.array().safeParse(users);
  if (!parsedUsers.success) {
    return json({ error: 'Invalid user data' }, { status: 500 });
  }

  return json(parsedUsers.data);
};
