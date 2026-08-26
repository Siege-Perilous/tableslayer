<script lang="ts">
  import { onMount } from 'svelte';

  type TurnstileProps = {
    siteKey: string;
    onToken: (token: string | null) => void;
    /** 'always' reserves space and shows the widget; 'interaction-only' hides it unless Cloudflare needs a click */
    appearance?: 'always' | 'interaction-only';
  };

  let { siteKey, onToken, appearance = 'interaction-only' }: TurnstileProps = $props();

  let container: HTMLDivElement;
  let widgetId: string | undefined;
  let isVisible = $state(false);

  const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  const loadTurnstileScript = () =>
    new Promise<void>((resolve) => {
      if (window.turnstile) return resolve();
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_URL}"]`);
      const script = existing ?? document.createElement('script');
      script.addEventListener('load', () => resolve(), { once: true });
      if (!existing) {
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        document.head.appendChild(script);
      }
    });

  export const reset = () => {
    if (widgetId !== undefined) window.turnstile?.reset(widgetId);
  };

  onMount(() => {
    let disposed = false;
    const resizeObserver = new ResizeObserver(([entry]) => {
      isVisible = entry.contentRect.height > 0;
    });
    resizeObserver.observe(container);

    loadTurnstileScript().then(() => {
      if (disposed || !window.turnstile) return;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        theme: document.documentElement.classList.contains('light') ? 'light' : 'dark',
        size: 'flexible',
        appearance,
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null)
      });
    });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  });
</script>

<div
  bind:this={container}
  class="turnstile"
  class:turnstile--always={appearance === 'always'}
  class:turnstile--visible={isVisible}
  data-testid="turnstile"
></div>

<style>
  /* Reserve the widget's height up front so it never shifts the form */
  .turnstile--always {
    min-height: 68px;
    margin-bottom: 1rem;
  }

  /* In interaction-only mode, add spacing only once the widget actually occupies space */
  .turnstile--visible {
    margin-bottom: 1rem;
  }
</style>
