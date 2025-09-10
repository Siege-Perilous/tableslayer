import { db } from '$lib/db/app';
import { usersTable } from '$lib/db/app/schema';
import { eq } from 'drizzle-orm';

export const isAdmin = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;

  try {
    const user = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).get();

    return user?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
