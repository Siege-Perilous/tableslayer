import { getWorkspaceFromSlug } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  console.log('params', params);
  const workspace = await getWorkspaceFromSlug(params.workspace);
  console.log('workspace', workspace);
  return {
    workspace
  };
}) satisfies PageServerLoad;
