import { db } from '$lib/db';
import { workspaceTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const getWorkspace = async (workspaceId: string) => {
  const workspace = await db.select().from(workspaceTable).where(eq(workspaceTable.id, workspaceId)).get();
  return workspace;
};

export const getWorkspaceFromName = async (workspaceName: string) => {
  const workspace = await db.select().from(workspaceTable).where(eq(workspaceTable.name, workspaceName)).get();
  return workspace;
};

export const getWorkspaceFromSlug = async (workspaceSlug: string) => {
  const workspace = await db.select().from(workspaceTable).where(eq(workspaceTable.slug, workspaceSlug)).get();
  return workspace;
};
