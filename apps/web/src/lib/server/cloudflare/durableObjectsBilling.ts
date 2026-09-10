// Pure Durable Objects billing arithmetic. Cloudflare bills wall-clock time
// while an object is active at 128 MB, in GB-seconds, with a monthly
// allowance, rounded UP to the next unit past it.

export const DO_MEMORY_GB = 0.125;
export const DO_FREE_GB_SECONDS = 400_000;
export const DO_BILLING_UNIT_GB_SECONDS = 1_000_000;
export const DO_BILLING_UNIT_USD = 12.5;
const MIN_PROJECTION_ELAPSED_MS = 60 * 60 * 1000;

export interface BillingCycle {
  start: number;
  end: number;
}

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

// Date.UTC normalises month overflow, so monthIndex ±1 crosses years correctly
const cycleStartFor = (year: number, monthIndex: number, startDay: number) => {
  const normalised = new Date(Date.UTC(year, monthIndex, 1));
  const y = normalised.getUTCFullYear();
  const m = normalised.getUTCMonth();
  return Date.UTC(y, m, Math.min(startDay, daysInMonth(y, m)));
};

/** The billing cycle containing `now`: [startDay of a month, startDay of the next), UTC. */
export const billingCycleBounds = (now: number, startDay: number): BillingCycle => {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const thisMonthStart = cycleStartFor(year, month, startDay);
  if (now >= thisMonthStart) {
    return { start: thisMonthStart, end: cycleStartFor(year, month + 1, startDay) };
  }
  return { start: cycleStartFor(year, month - 1, startDay), end: thisMonthStart };
};

/** `activeTime` from the analytics API is in microseconds. */
export const gbSecondsFromActiveTimeMicros = (micros: number) => (micros / 1e6) * DO_MEMORY_GB;

/** Straight-line projection of cycle-to-date usage across the whole cycle. */
export const projectCycle = (gbSeconds: number, cycle: BillingCycle, now: number) => {
  const total = cycle.end - cycle.start;
  const elapsed = Math.min(Math.max(now - cycle.start, MIN_PROJECTION_ELAPSED_MS), total);
  return gbSeconds * (total / elapsed);
};

export const estimateCostUsd = (gbSeconds: number) =>
  Math.max(0, Math.ceil((gbSeconds - DO_FREE_GB_SECONDS) / DO_BILLING_UNIT_GB_SECONDS)) * DO_BILLING_UNIT_USD;
