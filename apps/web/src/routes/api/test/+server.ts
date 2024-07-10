import { db } from '$lib/db';
import { usersTable } from '$lib/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const users = await db.select().from(usersTable);
  return json(users);
};
