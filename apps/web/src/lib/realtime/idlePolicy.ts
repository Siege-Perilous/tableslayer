// Pure idle policy for realtime connections — no DOM, no Svelte. The browser
// adapter (SleepController) feeds it events and applies the effects. Every
// decision is made from timestamps carried on the event, never from timer
// cadence, so a late timer (throttled background tab, mobile freeze) that fires
// after the tab became visible again does not put the client to sleep.

export interface IdlePolicyConfig {
  /** Sleep once the tab has been hidden this long. */
  hiddenSleepMs: number;
  /** Sleep once neither local input nor remote activity has happened for this long. */
  idleSleepMs: number;
  /** If set, emit a `ping` at most this often while there has been input since the last one. */
  pingIntervalMs?: number;
}

export const EDITOR_IDLE_POLICY: IdlePolicyConfig = {
  hiddenSleepMs: 5 * 60_000,
  idleSleepMs: 60 * 60_000,
  pingIntervalMs: 2 * 60_000
};

export const PLAY_IDLE_POLICY: IdlePolicyConfig = {
  hiddenSleepMs: 5 * 60_000,
  idleSleepMs: 30 * 60_000
};

export type SleepReason = 'hidden' | 'idle';
export type WakeReason = 'visible' | 'focus' | 'input' | 'poll';

export interface IdlePolicyState {
  phase: 'awake' | 'asleep';
  visible: boolean;
  hiddenSince: number | null;
  lastInputAt: number;
  lastRemoteAt: number;
  sleptAt: number | null;
  sleepReason: SleepReason | null;
  lastPingAt: number | null;
  inputSincePing: boolean;
}

export type IdleEvent =
  | { type: 'input'; at: number }
  | { type: 'remote'; at: number }
  | { type: 'visibility'; visible: boolean; at: number }
  | { type: 'focus'; at: number }
  | { type: 'tick'; at: number; canSleep: boolean }
  | { type: 'wake'; at: number; reason: WakeReason };

export type IdleEffect =
  { type: 'sleep'; reason: SleepReason } | { type: 'wake'; reason: WakeReason } | { type: 'ping' };

export interface IdleReduction {
  state: IdlePolicyState;
  effects: IdleEffect[];
}

export const createIdleState = (now: number, visible: boolean): IdlePolicyState => ({
  phase: 'awake',
  visible,
  hiddenSince: visible ? null : now,
  lastInputAt: now,
  lastRemoteAt: now,
  sleptAt: null,
  sleepReason: null,
  lastPingAt: null,
  inputSincePing: false
});

const pingDue = (state: IdlePolicyState, at: number, config: IdlePolicyConfig) =>
  !!config.pingIntervalMs &&
  state.inputSincePing &&
  (state.lastPingAt === null || at - state.lastPingAt >= config.pingIntervalMs);

const pingIfDue = (state: IdlePolicyState, at: number, config: IdlePolicyConfig): IdleReduction =>
  pingDue(state, at, config)
    ? { state: { ...state, lastPingAt: at, inputSincePing: false }, effects: [{ type: 'ping' }] }
    : { state, effects: [] };

const noteInput = (state: IdlePolicyState, at: number, config: IdlePolicyConfig): IdleReduction =>
  pingIfDue({ ...state, lastInputAt: at, inputSincePing: true }, at, config);

const sleep = (state: IdlePolicyState, at: number, reason: SleepReason): IdleReduction => ({
  state: { ...state, phase: 'asleep', sleptAt: at, sleepReason: reason },
  effects: [{ type: 'sleep', reason }]
});

// Both activity clocks reset on wake: a hidden-sleep woken by visibility would
// otherwise re-sleep on the next tick because its idle clock is still stale.
const wake = (state: IdlePolicyState, at: number, reason: WakeReason, config: IdlePolicyConfig): IdleReduction => {
  const visible = reason === 'visible' ? true : state.visible;
  const woken: IdlePolicyState = {
    ...state,
    phase: 'awake',
    visible,
    hiddenSince: visible ? null : at,
    lastInputAt: at,
    lastRemoteAt: at,
    sleptAt: null,
    sleepReason: null
  };
  const effects: IdleEffect[] = [{ type: 'wake', reason }];
  if (config.pingIntervalMs) {
    effects.push({ type: 'ping' });
    return { state: { ...woken, lastPingAt: at, inputSincePing: false }, effects };
  }
  return { state: woken, effects };
};

const reduceAsleep = (state: IdlePolicyState, event: IdleEvent, config: IdlePolicyConfig): IdleReduction => {
  switch (event.type) {
    case 'input':
      return wake(state, event.at, 'input', config);
    case 'focus':
      return wake(state, event.at, 'focus', config);
    case 'wake':
      return wake(state, event.at, event.reason, config);
    case 'visibility':
      return event.visible
        ? wake(state, event.at, 'visible', config)
        : { state: { ...state, visible: false }, effects: [] };
    default:
      return { state, effects: [] };
  }
};

const reduceAwake = (state: IdlePolicyState, event: IdleEvent, config: IdlePolicyConfig): IdleReduction => {
  switch (event.type) {
    case 'input':
      return noteInput(state, event.at, config);
    case 'remote':
      return { state: { ...state, lastRemoteAt: event.at }, effects: [] };
    case 'visibility':
      return event.visible
        ? noteInput({ ...state, visible: true, hiddenSince: null }, event.at, config)
        : { state: { ...state, visible: false, hiddenSince: event.at }, effects: [] };
    case 'focus':
      return noteInput({ ...state, hiddenSince: null }, event.at, config);
    case 'tick': {
      if (!event.canSleep) return { state, effects: [] };
      if (state.hiddenSince !== null && event.at - state.hiddenSince >= config.hiddenSleepMs) {
        return sleep(state, event.at, 'hidden');
      }
      if (event.at - Math.max(state.lastInputAt, state.lastRemoteAt) >= config.idleSleepMs) {
        return sleep(state, event.at, 'idle');
      }
      return pingIfDue(state, event.at, config);
    }
    case 'wake':
      return { state, effects: [] };
  }
};

export const reduceIdle = (state: IdlePolicyState, event: IdleEvent, config: IdlePolicyConfig): IdleReduction =>
  state.phase === 'asleep' ? reduceAsleep(state, event, config) : reduceAwake(state, event, config);

/** Earliest time a tick could change anything, or null while asleep (nothing to wait for). */
export const nextDeadline = (state: IdlePolicyState, config: IdlePolicyConfig): number | null => {
  if (state.phase === 'asleep') return null;
  const deadlines = [Math.max(state.lastInputAt, state.lastRemoteAt) + config.idleSleepMs];
  if (state.hiddenSince !== null) deadlines.push(state.hiddenSince + config.hiddenSleepMs);
  if (config.pingIntervalMs && state.inputSincePing && state.lastPingAt !== null) {
    deadlines.push(state.lastPingAt + config.pingIntervalMs);
  }
  return Math.min(...deadlines);
};

/**
 * Dev-only tuning from a query string, values in seconds:
 * `?hiddenSleep=5&idleSleep=10&ping=5`. Unknown or non-positive values keep
 * the base policy; `ping` is ignored for policies without a ping interval.
 */
export const idlePolicyFromSearch = (base: IdlePolicyConfig, search: string): IdlePolicyConfig => {
  const params = new URLSearchParams(search);
  const seconds = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value * 1000 : null;
  };
  return {
    hiddenSleepMs: seconds('hiddenSleep') ?? base.hiddenSleepMs,
    idleSleepMs: seconds('idleSleep') ?? base.idleSleepMs,
    ...(base.pingIntervalMs === undefined ? {} : { pingIntervalMs: seconds('ping') ?? base.pingIntervalMs })
  };
};
