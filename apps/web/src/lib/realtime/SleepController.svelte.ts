import { browser, dev } from '$app/environment';
import {
  createIdleState,
  idlePolicyFromSearch,
  nextDeadline,
  reduceIdle,
  type IdleEvent,
  type IdlePolicyConfig,
  type IdlePolicyState,
  type SleepReason,
  type WakeReason
} from './idlePolicy';
import type { SessionDocClient } from './SessionDocClient.svelte';

// Capture phase so a Stage handler's stopPropagation cannot hide input from us
const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'pointermove', 'touchmove'] as const;
const DISPATCH_GATE_MS = 1000;
const BLOCKED_RECHECK_MS = 30_000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export interface SleepControllerOptions {
  policy: IdlePolicyConfig;
  /** Return false while a gesture is in flight; sleep is re-checked in 30 s. */
  canSleep?: () => boolean;
  onSleep?: (reason: SleepReason) => void;
  onWake?: (reason: WakeReason) => void;
  /** Fired when the editor should tell the server it is active (see idlePolicy). */
  onPing?: () => void;
}

/**
 * Browser adapter for the idle policy: watches input, visibility, focus and
 * remote doc activity, and sleeps/wakes the bound SessionDocClient. One
 * re-armed timeout evaluates the policy at the next deadline; every decision is
 * made from timestamps, so a late timer is harmless.
 */
export class SleepController {
  phase = $state<'awake' | 'asleep'>('awake');
  sleepReason = $state<SleepReason | null>(null);
  sleptAt = $state<number | null>(null);

  #options: SleepControllerOptions;
  #policy: IdlePolicyConfig;
  #state: IdlePolicyState;
  #client: SessionDocClient | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #lastInputDispatchAt = 0;
  #lastRemoteDispatchAt = 0;
  #lastPointer: { x: number; y: number } | null = null;
  #removeListeners: Array<() => void> = [];
  #destroyed = false;

  constructor(options: SleepControllerOptions) {
    this.#options = options;
    // Dev only: ?hiddenSleep=5&idleSleep=10&ping=5 (seconds) to test without waiting
    this.#policy = dev && browser ? idlePolicyFromSearch(options.policy, location.search) : options.policy;
    const now = Date.now();
    this.#state = createIdleState(now, browser ? document.visibilityState === 'visible' : true);
    if (!browser) return;

    const onInput = (event: Event) => {
      if (this.#isStationaryPointer(event)) return;
      this.#noteInput();
    };
    for (const type of INPUT_EVENTS) {
      document.addEventListener(type, onInput, { capture: true, passive: true });
      this.#removeListeners.push(() => document.removeEventListener(type, onInput, { capture: true }));
    }
    const onVisibility = () =>
      this.#dispatch({ type: 'visibility', visible: document.visibilityState === 'visible', at: Date.now() });
    document.addEventListener('visibilitychange', onVisibility);
    this.#removeListeners.push(() => document.removeEventListener('visibilitychange', onVisibility));

    const onFocus = () => this.#dispatch({ type: 'focus', at: Date.now() });
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    this.#removeListeners.push(() => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
    });

    this.#arm();
  }

  /** Attach the client to sleep/wake. Returns an unbind (the play route swaps clients). */
  bindClient(client: SessionDocClient): () => void {
    this.#client = client;
    const unsubscribe = client.onRemoteActivity((at) => this.#noteRemote(at));
    return () => {
      unsubscribe();
      if (this.#client === client) this.#client = null;
    };
  }

  /** External wake (e.g. the playfield's poll saw a change). No-op while awake. */
  wake(reason: WakeReason) {
    this.#dispatch({ type: 'wake', at: Date.now(), reason });
  }

  // Browsers synthesize pointermove when layout changes under a resting cursor
  // (the sleep overlay appearing is exactly that); only real movement counts
  #isStationaryPointer(event: Event): boolean {
    if (event.type !== 'pointermove' || !(event instanceof PointerEvent)) return false;
    const previous = this.#lastPointer;
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    return previous !== null && previous.x === event.clientX && previous.y === event.clientY;
  }

  #noteInput() {
    const now = Date.now();
    // Gate while awake only: the first touch on a sleeping display must wake it
    if (this.#state.phase === 'awake' && now - this.#lastInputDispatchAt < DISPATCH_GATE_MS) return;
    this.#lastInputDispatchAt = now;
    this.#dispatch({ type: 'input', at: now });
  }

  #noteRemote(at: number) {
    if (at - this.#lastRemoteDispatchAt < DISPATCH_GATE_MS) return;
    this.#lastRemoteDispatchAt = at;
    this.#dispatch({ type: 'remote', at });
  }

  #dispatch(event: IdleEvent) {
    if (this.#destroyed) return;
    const { state, effects } = reduceIdle(this.#state, event, this.#policy);
    this.#state = state;
    for (const effect of effects) {
      if (effect.type === 'sleep') {
        this.#client?.disconnect();
        this.#options.onSleep?.(effect.reason);
      } else if (effect.type === 'wake') {
        this.#client?.connect();
        this.#options.onWake?.(effect.reason);
      } else {
        this.#options.onPing?.();
      }
    }
    this.phase = state.phase;
    this.sleepReason = state.sleepReason;
    this.sleptAt = state.sleptAt;
    this.#arm();
  }

  #arm() {
    const deadline = nextDeadline(this.#state, this.#policy);
    if (deadline === null) {
      this.#clearTimer();
      return;
    }
    this.#armIn(deadline - Date.now());
  }

  #armIn(delayMs: number) {
    this.#clearTimer();
    this.#timer = setTimeout(() => this.#tick(), Math.min(Math.max(delayMs, 0), MAX_TIMEOUT_MS));
  }

  #clearTimer() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }

  #tick() {
    this.#timer = null;
    const canSleep = this.#options.canSleep?.() ?? true;
    this.#dispatch({ type: 'tick', at: Date.now(), canSleep });
    if (!canSleep && this.#state.phase === 'awake') this.#armIn(BLOCKED_RECHECK_MS);
  }

  destroy() {
    this.#destroyed = true;
    this.#clearTimer();
    this.#removeListeners.forEach((remove) => remove());
    this.#removeListeners = [];
    this.#client = null;
  }
}
