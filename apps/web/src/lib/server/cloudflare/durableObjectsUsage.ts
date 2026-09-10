import { getBillingCycleStartDay, isCloudflareAnalyticsEnabled } from '$lib/server/config';
import {
  DO_FREE_GB_SECONDS,
  billingCycleBounds,
  estimateCostUsd,
  gbSecondsFromActiveTimeMicros,
  projectCycle
} from './durableObjectsBilling';

export interface DurableObjectsUsage {
  cycleStart: number;
  cycleEnd: number;
  gbSeconds: number;
  projectedGbSeconds: number;
  allowanceGbSeconds: number;
  estimatedCostUsd: number;
  projectedCostUsd: number;
  fetchedAt: number;
  error: string | null;
}

const CACHE_MS = 10 * 60 * 1000;
const ERROR_CACHE_MS = 60 * 1000;
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
// Analytics queries regularly take several seconds; the page streams this result
const FETCH_TIMEOUT_MS = 20_000;

let cache: { usage: DurableObjectsUsage; expiresAt: number } | null = null;

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface AnalyticsResponse {
  data?: {
    viewer?: {
      accounts?: Array<{
        durableObjectsPeriodicGroups?: Array<{ dimensions: { date: string }; sum: { activeTime: number } }>;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

// `activeTime` is microseconds; the `duration` field is empty for this account.
const fetchActiveTimeMicros = async (accountId: string, token: string, dateStart: string, dateEnd: string) => {
  const query = `{
    viewer {
      accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
        durableObjectsPeriodicGroups(limit: 100, filter: { date_geq: "${dateStart}", date_leq: "${dateEnd}" }) {
          dimensions { date }
          sum { activeTime }
        }
      }
    }
  }`;
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Cloudflare analytics returned ${response.status}`);
  const json = (await response.json()) as AnalyticsResponse;
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  const groups = json.data?.viewer?.accounts?.[0]?.durableObjectsPeriodicGroups ?? [];
  return groups.reduce((total, group) => total + (group.sum?.activeTime ?? 0), 0);
};

/**
 * Cycle-to-date Durable Objects usage from Cloudflare analytics. Null when not
 * configured; never throws — errors come back on the result and are cached
 * briefly so a broken token does not slow every admin load.
 */
export const getDurableObjectsUsage = async (now = Date.now()): Promise<DurableObjectsUsage | null> => {
  if (!isCloudflareAnalyticsEnabled()) return null;
  if (cache && cache.expiresAt > now) return cache.usage;

  const cycle = billingCycleBounds(now, getBillingCycleStartDay());
  const base = {
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    allowanceGbSeconds: DO_FREE_GB_SECONDS,
    fetchedAt: now
  };
  try {
    const micros = await fetchActiveTimeMicros(
      process.env.CLOUDFLARE_ACCOUNT_ID!,
      process.env.CLOUDFLARE_WORKERS_KEY!,
      isoDate(cycle.start),
      isoDate(now)
    );
    const gbSeconds = gbSecondsFromActiveTimeMicros(micros);
    const projectedGbSeconds = projectCycle(gbSeconds, cycle, now);
    const usage: DurableObjectsUsage = {
      ...base,
      gbSeconds,
      projectedGbSeconds,
      estimatedCostUsd: estimateCostUsd(gbSeconds),
      projectedCostUsd: estimateCostUsd(projectedGbSeconds),
      error: null
    };
    cache = { usage, expiresAt: now + CACHE_MS };
    return usage;
  } catch (error) {
    const usage: DurableObjectsUsage = {
      ...base,
      gbSeconds: 0,
      projectedGbSeconds: 0,
      estimatedCostUsd: 0,
      projectedCostUsd: 0,
      error: error instanceof Error ? error.message : String(error)
    };
    cache = { usage, expiresAt: now + ERROR_CACHE_MS };
    return usage;
  }
};
