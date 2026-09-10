import { getDurableObjectsUsage } from '$lib/server/cloudflare/durableObjectsUsage';
import { DEFAULT_USAGE_WINDOW_DAYS, USAGE_WINDOW_DAYS, getRealtimeUsage } from '$lib/server/realtime/usage';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
  depends('admin:usage');
  const requested = Number(url.searchParams.get('days'));
  const windowDays = USAGE_WINDOW_DAYS.find((days) => days === requested) ?? DEFAULT_USAGE_WINDOW_DAYS;
  return {
    usage: await getRealtimeUsage(windowDays),
    windowOptions: USAGE_WINDOW_DAYS,
    // Nested promise: SvelteKit streams it, so a slow Cloudflare answer never delays the page
    streamed: { cloudflare: getDurableObjectsUsage() }
  };
};
