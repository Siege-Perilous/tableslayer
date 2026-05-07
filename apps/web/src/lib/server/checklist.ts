import { db } from '$lib/db/app';
import { usersTable } from '$lib/db/app/schema';
import { eq } from 'drizzle-orm';

export const CHECKLIST_DISMISSED_MARKER = '__dismissed__';

export const updateUserChecklistProgress = async (userId: string, completedItems: string[], dismissed?: boolean) => {
  try {
    const items = dismissed
      ? [...completedItems.filter((item) => item !== CHECKLIST_DISMISSED_MARKER), CHECKLIST_DISMISSED_MARKER]
      : completedItems.filter((item) => item !== CHECKLIST_DISMISSED_MARKER);

    await db.update(usersTable).set({ completedChecklist: items }).where(eq(usersTable.id, userId)).execute();

    return { success: true, completedItems: items };
  } catch (error) {
    console.error('Error updating checklist progress', error);
    throw error;
  }
};

export const checkUserChecklistEligibility = (
  partiesCount: number,
  gameSessionsCount: number,
  scenesCount: number
): boolean => {
  // User is eligible for auto-show if they have:
  // - Exactly 1 party
  // - Exactly 1 game session
  // - Fewer than 4 scenes
  return partiesCount === 1 && gameSessionsCount === 1 && scenesCount < 4;
};

export const getUserChecklistState = async (userId: string) => {
  try {
    const user = await db
      .select({ completedChecklist: usersTable.completedChecklist })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    const completedItems = user?.completedChecklist ?? [];
    const isDismissed = completedItems.includes(CHECKLIST_DISMISSED_MARKER);

    return {
      completedItems: completedItems.filter((item) => item !== CHECKLIST_DISMISSED_MARKER),
      isDismissed
    };
  } catch (error) {
    console.error('Error getting checklist state', error);
    throw error;
  }
};
