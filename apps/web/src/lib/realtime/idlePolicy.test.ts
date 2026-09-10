import { describe, expect, it } from 'vitest';
import {
  createIdleState,
  idlePolicyFromSearch,
  nextDeadline,
  reduceIdle,
  type IdleEffect,
  type IdleEvent,
  type IdlePolicyConfig,
  type IdlePolicyState
} from './idlePolicy';

const config: IdlePolicyConfig = { hiddenSleepMs: 5_000, idleSleepMs: 60_000, pingIntervalMs: 20_000 };
const noPing: IdlePolicyConfig = { hiddenSleepMs: 5_000, idleSleepMs: 60_000 };
const T0 = 1_000_000;

const run = (state: IdlePolicyState, events: IdleEvent[], cfg = config) => {
  const effects: IdleEffect[] = [];
  for (const event of events) {
    const result = reduceIdle(state, event, cfg);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
};

const tick = (at: number, canSleep = true): IdleEvent => ({ type: 'tick', at, canSleep });

describe('idle sleep', () => {
  it('sleeps after idleSleepMs without input or remote activity', () => {
    const { state, effects } = run(createIdleState(T0, true), [tick(T0 + 59_000), tick(T0 + 60_000)]);
    expect(effects).toEqual([{ type: 'sleep', reason: 'idle' }]);
    expect(state.phase).toBe('asleep');
    expect(state.sleptAt).toBe(T0 + 60_000);
  });

  it('remote activity postpones idle sleep', () => {
    const { state } = run(createIdleState(T0, true), [{ type: 'remote', at: T0 + 50_000 }, tick(T0 + 60_000)]);
    expect(state.phase).toBe('awake');
    expect(nextDeadline(state, config)).toBe(T0 + 110_000);
  });

  it('does not sleep when the adapter reports a gesture in progress', () => {
    const { state, effects } = run(createIdleState(T0, true), [tick(T0 + 60_000, false)]);
    expect(effects).toEqual([]);
    expect(state.phase).toBe('awake');
  });

  it('ignores remote activity and ticks while asleep', () => {
    const asleep = run(createIdleState(T0, true), [tick(T0 + 60_000)]).state;
    const { state, effects } = run(asleep, [{ type: 'remote', at: T0 + 70_000 }, tick(T0 + 80_000)]);
    expect(effects).toEqual([]);
    expect(state.phase).toBe('asleep');
    expect(nextDeadline(state, config)).toBeNull();
  });
});

describe('hidden sleep', () => {
  it('sleeps after hiddenSleepMs hidden even with remote activity', () => {
    const { state, effects } = run(createIdleState(T0, true), [
      { type: 'visibility', visible: false, at: T0 + 1_000 },
      { type: 'remote', at: T0 + 5_000 },
      tick(T0 + 6_000)
    ]);
    expect(effects).toEqual([{ type: 'sleep', reason: 'hidden' }]);
    expect(state.sleepReason).toBe('hidden');
  });

  it('a late tick after the tab became visible does not sleep', () => {
    const { state, effects } = run(createIdleState(T0, true), [
      { type: 'visibility', visible: false, at: T0 + 1_000 },
      { type: 'visibility', visible: true, at: T0 + 4_000 },
      tick(T0 + 30_000)
    ]);
    expect(effects.filter((e) => e.type === 'sleep')).toEqual([]);
    expect(state.hiddenSince).toBeNull();
  });

  it('becoming visible wakes and resets both activity clocks', () => {
    const asleep = run(createIdleState(T0, true), [
      { type: 'visibility', visible: false, at: T0 + 1_000 },
      tick(T0 + 6_000)
    ]).state;
    const { state, effects } = run(asleep, [{ type: 'visibility', visible: true, at: T0 + 100_000 }]);
    expect(effects[0]).toEqual({ type: 'wake', reason: 'visible' });
    expect(state.phase).toBe('awake');
    expect(state.lastInputAt).toBe(T0 + 100_000);
    expect(state.lastRemoteAt).toBe(T0 + 100_000);
    expect(state.hiddenSince).toBeNull();
    // A tick right after must not re-sleep on the stale idle clock
    expect(run(state, [tick(T0 + 100_001)]).effects).toEqual([]);
  });

  it('starts the hidden clock when created hidden', () => {
    const state = createIdleState(T0, false);
    expect(nextDeadline(state, config)).toBe(T0 + 5_000);
  });
});

describe('wake', () => {
  const asleep = () => run(createIdleState(T0, true), [tick(T0 + 60_000)], noPing).state;

  it('input, focus and external wake all wake with their reason', () => {
    expect(run(asleep(), [{ type: 'input', at: T0 + 70_000 }], noPing).effects).toEqual([
      { type: 'wake', reason: 'input' }
    ]);
    expect(run(asleep(), [{ type: 'focus', at: T0 + 70_000 }], noPing).effects).toEqual([
      { type: 'wake', reason: 'focus' }
    ]);
    expect(run(asleep(), [{ type: 'wake', at: T0 + 70_000, reason: 'poll' }], noPing).effects).toEqual([
      { type: 'wake', reason: 'poll' }
    ]);
  });

  it('pings on wake when a ping interval is configured', () => {
    const asleepWithPing = run(createIdleState(T0, true), [tick(T0 + 60_000)]).state;
    const { state, effects } = run(asleepWithPing, [{ type: 'input', at: T0 + 70_000 }]);
    expect(effects).toEqual([{ type: 'wake', reason: 'input' }, { type: 'ping' }]);
    expect(state.lastPingAt).toBe(T0 + 70_000);
  });

  it('an external wake while awake is a no-op', () => {
    const { effects } = run(createIdleState(T0, true), [{ type: 'wake', at: T0 + 1_000, reason: 'poll' }]);
    expect(effects).toEqual([]);
  });

  it('waking hidden keeps the hidden clock running from the wake time', () => {
    const asleepHidden = run(createIdleState(T0, true), [
      { type: 'visibility', visible: false, at: T0 + 1_000 },
      tick(T0 + 6_000)
    ]).state;
    const { state } = run(asleepHidden, [{ type: 'wake', at: T0 + 10_000, reason: 'poll' }], noPing);
    expect(state.visible).toBe(false);
    expect(state.hiddenSince).toBe(T0 + 10_000);
  });
});

describe('ping', () => {
  it('pings immediately on the first input, then at most once per interval', () => {
    const { state, effects } = run(createIdleState(T0, true), [
      { type: 'input', at: T0 + 1_000 },
      { type: 'input', at: T0 + 2_000 },
      tick(T0 + 10_000),
      { type: 'input', at: T0 + 21_000 }
    ]);
    expect(effects).toEqual([{ type: 'ping' }, { type: 'ping' }]);
    expect(state.lastPingAt).toBe(T0 + 21_000);
    expect(state.inputSincePing).toBe(false);
  });

  it('a tick pings when input happened since the last ping and the interval elapsed', () => {
    const { effects } = run(createIdleState(T0, true), [
      { type: 'input', at: T0 + 1_000 },
      { type: 'input', at: T0 + 2_000 },
      tick(T0 + 21_000)
    ]);
    expect(effects).toEqual([{ type: 'ping' }, { type: 'ping' }]);
  });

  it('never pings without input, and never without a ping interval', () => {
    expect(run(createIdleState(T0, true), [tick(T0 + 21_000)]).effects).toEqual([]);
    expect(run(createIdleState(T0, true), [{ type: 'input', at: T0 + 1_000 }], noPing).effects).toEqual([]);
  });

  it('includes the pending ping in the next deadline', () => {
    const { state } = run(createIdleState(T0, true), [
      { type: 'input', at: T0 + 1_000 },
      { type: 'input', at: T0 + 2_000 }
    ]);
    expect(nextDeadline(state, config)).toBe(T0 + 21_000);
  });
});

describe('idlePolicyFromSearch', () => {
  it('overrides thresholds from seconds in the query string', () => {
    expect(idlePolicyFromSearch(config, '?hiddenSleep=5&idleSleep=10&ping=3')).toEqual({
      hiddenSleepMs: 5_000,
      idleSleepMs: 10_000,
      pingIntervalMs: 3_000
    });
  });

  it('keeps the base policy for missing or invalid values and never adds a ping interval', () => {
    expect(idlePolicyFromSearch(config, '?idleSleep=abc&hiddenSleep=0')).toEqual(config);
    expect(idlePolicyFromSearch(noPing, '?ping=5&idleSleep=10')).toEqual({ hiddenSleepMs: 5_000, idleSleepMs: 10_000 });
  });
});
