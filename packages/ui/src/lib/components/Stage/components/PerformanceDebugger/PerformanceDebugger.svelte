<script lang="ts">
  import { onMount } from 'svelte';
  import PerformanceOverlay from '../PerformanceOverlay/PerformanceOverlay.svelte';
  import { resetMetrics } from '../../helpers/performanceMetrics.svelte';
  import { debugState, setDebugEnabled } from '../../helpers/debugState.svelte';

  interface Props {
    /** Key combination to toggle (default: F9) */
    shortcut?: string;
    /** Callback when debug state changes (optional, for external notification) */
    onToggle?: (enabled: boolean) => void;
    /** Disabled layers for A/B testing */
    disabledLayers?: string[];
  }

  const { shortcut = 'F9', onToggle, disabledLayers = [] }: Props = $props();

  let showHelp = $state(false);

  // Use the global debug state
  const enabled = $derived(debugState.enableMetrics);

  const parseShortcut = (shortcut: string) => {
    const parts = shortcut.split('+').map((p) => p.trim());
    const modifiers = ['shift', 'ctrl', 'control', 'alt', 'meta', 'cmd'];
    const keyPart = parts.find((p) => !modifiers.includes(p.toLowerCase())) || '';

    return {
      shift: parts.some((p) => p.toLowerCase() === 'shift'),
      ctrl: parts.some((p) => p.toLowerCase() === 'ctrl' || p.toLowerCase() === 'control'),
      alt: parts.some((p) => p.toLowerCase() === 'alt'),
      meta: parts.some((p) => p.toLowerCase() === 'meta' || p.toLowerCase() === 'cmd'),
      // Preserve case for function keys (F9, F10, etc.)
      key: keyPart.match(/^[fF]\d+$/) ? keyPart.toUpperCase() : keyPart.toLowerCase()
    };
  };

  const shortcutConfig = parseShortcut(shortcut);

  const formatShortcut = () => {
    const parts = [];
    if (shortcutConfig.shift) parts.push('Shift');
    if (shortcutConfig.ctrl) parts.push('Ctrl');
    if (shortcutConfig.alt) parts.push('Alt');
    if (shortcutConfig.meta) parts.push('Cmd');
    // Function keys display as-is (F9), others uppercase
    parts.push(shortcutConfig.key.match(/^F\d+$/) ? shortcutConfig.key : shortcutConfig.key.toUpperCase());
    return parts.join(' + ');
  };

  const isFormElement = (element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName;
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      (element as HTMLElement).isContentEditable
    );
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger while typing in form elements
    if (isFormElement(document.activeElement)) return;

    // Function keys (F1-F12) are case-sensitive in e.key, others we compare lowercase
    const isFunctionKey = shortcutConfig.key.match(/^F\d+$/);
    const keyMatches = isFunctionKey ? e.key === shortcutConfig.key : e.key.toLowerCase() === shortcutConfig.key;

    const matchesShortcut =
      e.shiftKey === shortcutConfig.shift &&
      e.ctrlKey === shortcutConfig.ctrl &&
      e.altKey === shortcutConfig.alt &&
      e.metaKey === shortcutConfig.meta &&
      keyMatches;

    if (matchesShortcut) {
      e.preventDefault();
      const newEnabled = !debugState.enableMetrics;
      setDebugEnabled(newEnabled);
      onToggle?.(newEnabled);

      if (newEnabled) {
        resetMetrics();
        showHelp = true;
        setTimeout(() => (showHelp = false), 2000);
      }
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  /** Get debug props to spread into Stage props */
  export const getDebugProps = () => ({
    enableStats: debugState.enableMetrics,
    loggingRate: 1000,
    enableMetrics: debugState.enableMetrics,
    logMetricsToConsole: debugState.logMetricsToConsole,
    disabledLayers
  });
</script>

{#if enabled}
  <PerformanceOverlay visible={true} {disabledLayers} />
{/if}

{#if showHelp}
  <div class="performanceDebugger__help">
    Performance metrics enabled. Press {formatShortcut()} to disable.
  </div>
{/if}

<style>
  .performanceDebugger__help {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--fg);
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 0.75rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-2);
    z-index: 1000;
    pointer-events: none;
    animation: performanceDebuggerFadeIn 0.2s var(--ease-out-3);
  }

  @keyframes performanceDebuggerFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
